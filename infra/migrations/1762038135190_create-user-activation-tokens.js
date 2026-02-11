/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
	pgm.createTable("user_activation_tokens", {
		id: {
			type: "uuid",
			primaryKey: true,
			default: pgm.func("gen_random_uuid()"),
		},
		used_at: {
			type: "timestamptz",
			notNull: false,
		},
		user_id: {
			type: "uuid",
			notNull: true,
		},
		expires_at: {
			type: "timestamptz",
			notNull: false,
		},
		created_at: {
			type: "timestamptz",
			notNull: false,
			default: pgm.func("timezone('utc', now())"),
		},
		updated_at: {
			type: "timestamptz",
			notNull: false,
			default: pgm.func("timezone('utc', now())"),
		},
	})
}
