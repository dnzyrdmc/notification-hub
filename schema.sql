-- Referans şema: uygulama açılışında IF NOT EXISTS ile oluşturulur.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS templates(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),name TEXT,body TEXT);
 CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),template TEXT REFERENCES templates(id),channel TEXT,recipient TEXT,body TEXT,status TEXT,attempt INTEGER DEFAULT 0,next_at INTEGER,last_error TEXT,dedupe TEXT,UNIQUE(owner,dedupe));
