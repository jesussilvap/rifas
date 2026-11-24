import { createReservaSchema } from "../validators/schemas.js";
import {
  crearReserva,
  obtenerReservaPorToken,
} from "../services/reservaService.js";

export async function crearReservaPublica(req, res, next) {
  try {
    const input = createReservaSchema.parse(req.body);
    const data = await crearReserva({
      ...input,
      ip: req.ip,
    });
    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function consultarReservaPublica(req, res, next) {
  try {
    const { token } = req.params;
    const data = await obtenerReservaPorToken(token);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}
