const versions = [
    {
        version: 0,
        up: async (db: DB) => {
            // await db.execute(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)`);
            // console.log('db.insert', await db.insert(`INSERT INTO users (name, email) VALUES (?, ?)`,['Alice', 'alice@example.com']));
            // console.log('db.select', await db.select(`SELECT * FROM users`));
            // console.log('db.first', await db.first(`SELECT * FROM users`));
        },
    },
    {
        version: 1,
        up: async (db: DB) => {
            await db.execute(`CREATE TABLE IF NOT EXISTS kvdb_data
                              (
                                  id           TEXT PRIMARY KEY,
                                  cloudVersion INTEGER,
                                  version      INTEGER,
                                  isDeleted    INTEGER,
                                  name         TEXT
                              )`);
            await db.execute(`CREATE INDEX IF NOT EXISTS idx_kvdb_data_name
                ON kvdb_data (name)
            `);
        },
    },
];

export default {
    versions,
};
