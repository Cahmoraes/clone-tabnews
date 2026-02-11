import { controller } from "infra/controller"
import { activation } from "models/activation"
import user from "models/user"
import { createRouter } from "next-connect"

const router = createRouter()

router.use(controller.injectAnonymousOrUser)
router.post(controller.canRequest("create:user"), postHandler)

export default router.handler(controller.errorHandlers)

async function postHandler(request, response) {
	const userInputValues = request.body
	const newUser = await user.create(userInputValues)
	const activationToken = await activation.create(newUser.id)
	await activation.sendEmailToUser(newUser, activationToken)
	return response.status(201).json(newUser)
}
