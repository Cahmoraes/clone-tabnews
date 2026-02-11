import { Pool } from "pg";
import { ServiceError } from "./errors";

let pool;

function getPool() {
	if (!pool) {
		pool = new Pool({
			host: process.env.POSTGRES_HOST,
			port: process.env.POSTGRES_PORT,
			user: process.env.POSTGRES_USER,
			database: process.env.POSTGRES_DB,
			password: process.env.POSTGRES_PASSWORD,
			ssl: sslValues(),
			max: 20, // máximo de conexões simultâneas
			idleTimeoutMillis: 30000, // fecha conexões ociosas após 30s
			connectionTimeoutMillis: 2000, // timeout para obter conexão do pool
		});
	}
	return pool;
}

async function query(queryObject) {
	try {
		const pool = getPool();
		const result = await pool.query(queryObject);
		return result;
	} catch (error) {
		const serviceErrorObject = new ServiceError({
			message: "Erro na conexão com Banco ou na Query",
			cause: error,
		});
		throw serviceErrorObject;
	}
}

async function getNewClient() {
	const pool = getPool();
	const client = await pool.connect();
	return client;
}

const database = {
	query,
	getNewClient,
};

export default database;

function sslValues() {
	return process.env.NODE_ENV === "production" ? true : false;
}
