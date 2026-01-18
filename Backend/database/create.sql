DROP TABLE IF EXISTS account;
CREATE TABLE account (
	id INTEGER PRIMARY KEY,
	name VARCHAR(20),
	email VARCHAR(20) UNIQUE NOT NULL,
	password VARCHAR(20)
);

DROP TABLE IF EXISTS pin;
CREATE TABLE pin (
	id INTEGER PRIMARY KEY,
	creatorID INTEGER,
	latitude REAL,
	longitude REAL,
	title VARCHAR(200),
	address VARCHAR(200),
	description VARCHAR(500),
	image VARCHAR(2000),

	likes INTEGER,

	FOREIGN KEY (creatorID) REFERENCES account(id)
);

DROP TABLE IF EXISTS comment;
CREATE TABLE comment (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pinID INTEGER,
	accountID INTEGER,
	comment VARCHAR(280),
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (pinID) REFERENCES pin(id),
	FOREIGN KEY (accountID) REFERENCES account(id)
);
