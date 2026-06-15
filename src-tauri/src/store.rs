use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub connections: Vec<Connection>,
    pub snippets: Vec<Snippet>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub conn_type: String,
    pub project_path: String,
    pub php_binary: String,
    pub ssh: Option<SshConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth: SshAuth,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshAuth {
    pub method: String,
    pub private_key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub code: String,
    pub updated_at: String,
}

pub struct Store {
    path: PathBuf,
    projects: Vec<Project>,
}

impl Store {
    pub fn new(app_config_dir: PathBuf) -> Self {
        fs::create_dir_all(&app_config_dir).ok();
        let path = app_config_dir.join("projects.json");
        let projects = if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            vec![]
        };
        Store { path, projects }
    }

    pub fn list_projects(&self) -> Vec<Project> {
        self.projects.clone()
    }

    pub fn save_project(&mut self, project: Project) -> Project {
        if let Some(pos) = self.projects.iter().position(|p| p.id == project.id) {
            self.projects[pos] = project.clone();
        } else {
            self.projects.push(project.clone());
        }
        self.persist();
        project
    }

    pub fn delete_project(&mut self, id: &str) {
        self.projects.retain(|p| p.id != id);
        self.persist();
    }

    fn persist(&self) {
        if let Ok(json) = serde_json::to_string_pretty(&self.projects) {
            fs::write(&self.path, json).ok();
        }
    }
}

const KEYRING_SERVICE: &str = "tinkerlite";

pub fn set_secret(connection_id: &str, secret: &str) -> Result<(), String> {
    Entry::new(KEYRING_SERVICE, connection_id)
        .map_err(|e| e.to_string())?
        .set_password(secret)
        .map_err(|e| e.to_string())
}

pub fn get_secret(connection_id: &str) -> Result<String, String> {
    Entry::new(KEYRING_SERVICE, connection_id)
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|e| e.to_string())
}

pub fn has_secret(connection_id: &str) -> bool {
    Entry::new(KEYRING_SERVICE, connection_id)
        .ok()
        .and_then(|e| e.get_password().ok())
        .is_some()
}

pub fn delete_secret(connection_id: &str) -> Result<(), String> {
    Entry::new(KEYRING_SERVICE, connection_id)
        .map_err(|e| e.to_string())?
        .delete_password()
        .map_err(|e| e.to_string())
}
