CREATE TABLE tasks_workspace (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 4000),
  category TEXT NOT NULL CHECK(length(category) BETWEEN 1 AND 40),
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'progress', 'completed')),
  due_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  details TEXT NOT NULL DEFAULT '{}',
  completed_at INTEGER
);
INSERT INTO tasks_workspace (id,user_id,title,description,category,priority,status,due_date,created_at,updated_at,version)
SELECT id,user_id,title,description,category,priority,status,due_date,created_at,updated_at,version FROM tasks;
DROP TABLE tasks;
ALTER TABLE tasks_workspace RENAME TO tasks;
CREATE INDEX tasks_owner_status_due ON tasks(user_id,status,due_date);
CREATE TABLE user_categories (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 40),
  PRIMARY KEY(user_id,name)
);
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light',
  notifications INTEGER NOT NULL DEFAULT 1,
  start_view TEXT NOT NULL DEFAULT 'tasks'
);
