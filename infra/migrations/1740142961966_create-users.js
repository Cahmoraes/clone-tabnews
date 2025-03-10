/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    // For reference, Github limits usernames to 39 characters.
    username: {
      type: "varchar(30)",
      notNull: true,
      unique: true,
    },
    // Why 254 in length? https://security.stackexchange.com/a/39851
    email: {
      type: "varchar(254)",
      notNull: true,
      unique: true,
    },
    // Why 60 in length? https://www.npmjs.com/package/bcrypt#hash-info
    password: {
      type: 'varchar(60)',
      notNull: true,
    },
    // Why timezone? https://justatheory.com/2012/04/postgres-use-timestamptz/
    created_at: {
      type: 'timestamptz',
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    }
  })
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = false;
