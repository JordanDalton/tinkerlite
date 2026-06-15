mod runner;
mod store;

use runner::RunResult;
use store::{Connection, Project, Store};
use tauri::Manager;
use std::sync::Mutex;
use std::path::Path;
use tauri::State;

struct AppState {
    store: Mutex<Store>,
}

#[tauri::command]
fn list_projects(state: State<AppState>) -> Vec<Project> {
    state.store.lock().unwrap().list_projects()
}

#[tauri::command]
fn save_project(state: State<AppState>, project: Project) -> Project {
    state.store.lock().unwrap().save_project(project)
}

#[tauri::command]
fn delete_project(state: State<AppState>, id: String) {
    state.store.lock().unwrap().delete_project(&id);
}

#[tauri::command]
fn set_secret(connection_id: String, secret: String) -> Result<(), String> {
    store::set_secret(&connection_id, &secret)
}

#[tauri::command]
fn has_secret(connection_id: String) -> bool {
    store::has_secret(&connection_id)
}

#[tauri::command]
fn delete_secret(connection_id: String) -> Result<(), String> {
    store::delete_secret(&connection_id)
}

#[tauri::command]
async fn test_connection(conn: Connection) -> Result<RunResult, String> {
    tauri::async_runtime::spawn_blocking(move || runner::run(&conn, "return 1 + 1;"))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn run_code(conn: Connection, code: String) -> Result<RunResult, String> {
    tauri::async_runtime::spawn_blocking(move || runner::run(&conn, &code))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn run_code_trust_host(conn: Connection, code: String) -> Result<RunResult, String> {
    tauri::async_runtime::spawn_blocking(move || runner::run_trusting_host(&conn, &code))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn list_dir(path: String) -> Vec<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let expanded = if path == "~" {
        home.clone()
    } else if path.starts_with("~/") {
        format!("{}{}", home, &path[1..])
    } else if path.is_empty() {
        home.clone()
    } else {
        path.clone()
    };

    let p = Path::new(&expanded);
    let (dir, prefix): (std::path::PathBuf, String) = if expanded.ends_with('/') || p.is_dir() {
        (p.to_path_buf(), String::new())
    } else {
        let parent = p.parent().unwrap_or(Path::new("/"));
        let stem = p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
        (parent.to_path_buf(), stem)
    };

    let Ok(entries) = std::fs::read_dir(&dir) else {
        return vec![];
    };

    let mut results: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .filter(|e| {
            let name = e.file_name();
            let name = name.to_string_lossy();
            !name.starts_with('.') && (prefix.is_empty() || name.to_lowercase().starts_with(&prefix.to_lowercase()))
        })
        .map(|e| {
            let full = dir.join(e.file_name());
            let s = full.to_string_lossy().into_owned();
            // Re-collapse home to ~ for display
            if s.starts_with(&home) {
                format!("~{}", &s[home.len()..])
            } else {
                s
            }
        })
        .take(12)
        .collect();

    results.sort();
    results
}

#[tauri::command]
async fn scan_completions(conn: Connection) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || runner::scan(&conn))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn detect_php() -> String {
    use std::process::Command;
    let cmd = if cfg!(windows) { "where" } else { "which" };
    Command::new(cmd)
        .arg("php")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().lines().next().unwrap_or("php").to_string())
        .unwrap_or_else(|| "php".to_string())
}

#[tauri::command]
async fn list_dir_remote(conn: Connection, path: String) -> Vec<String> {
    let secret = crate::store::get_secret(&conn.id).unwrap_or_default();
    tauri::async_runtime::spawn_blocking(move || runner::list_dir_remote(&conn, &secret, &path))
        .await
        .unwrap_or_default()
}

#[tauri::command]
async fn list_php_binaries(conn: Connection) -> Vec<runner::PhpBinary> {
    let secret = crate::store::get_secret(&conn.id).unwrap_or_default();
    tauri::async_runtime::spawn_blocking(move || runner::list_php_binaries(&conn, &secret))
        .await
        .unwrap_or_default()
}

#[tauri::command]
async fn detect_php_remote(conn: Connection) -> String {
    let secret = crate::store::get_secret(&conn.id).unwrap_or_default();
    tauri::async_runtime::spawn_blocking(move || runner::detect_php_remote(&conn, &secret))
        .await
        .unwrap_or_else(|_| "php".to_string())
}

#[tauri::command]
async fn trust_host(host: String, port: u16) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || runner::trust_host(&host, port))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_config_dir = app.path().app_config_dir().unwrap();
            let store = Store::new(app_config_dir);
            app.manage(AppState {
                store: Mutex::new(store),
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_projects,
            save_project,
            delete_project,
            set_secret,
            has_secret,
            delete_secret,
            test_connection,
            run_code,
            run_code_trust_host,
            scan_completions,
            list_dir,
            trust_host,
            detect_php,
            detect_php_remote,
            list_php_binaries,
            list_dir_remote,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
