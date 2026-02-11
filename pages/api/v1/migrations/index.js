import { controller } from "infra/controller"
import migrator from "models/migrator"
import { createRouter } from "next-connect"

const router = createRouter()

router.get(getHandler)
router.post(postHandler)

export default router.handler(controller.errorHandlers)

async function getHandler(_request, response) {
	const pendingMigrations = await migrator.listPendingMigrations()
	return response.status(200).json(pendingMigrations)
}

async function postHandler(_request, response) {
	const migratedMigrations = await migrator.runPendingMigrations()
	if (migratedMigrations.length > 0) {
		return response.status(201).json(migratedMigrations)
	}
	return response.status(200).json(migratedMigrations)
}
