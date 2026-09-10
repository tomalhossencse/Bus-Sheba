import { Router } from "express";
import { TicketController } from "./ticket.controller";
import { auth } from "../../middleware/auth";

const router = Router();

// public - callback
router.get("/verify/:ticketNumber", TicketController.checkTicket);

// operator - callback
router.get(
	"/operator/:ticketNumber",
	auth("OPERATOR"),
	TicketController.previewOperatorTicket,
);

router.put(
	"/verify/:ticketNumber",
	auth("OPERATOR"),
	TicketController.verifyTicket,
);

export const TicketRoutes = router;
