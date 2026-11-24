import { Router } from "express";
import publicRoutes from "./publicRoutes.js";
import adminRoutes from "./adminRoutes.js";
import { testDatabaseConnection } from "../config/database.js";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    const dbOk = await testDatabaseConnection();
    res.json({ ok: true, status: "healthy", database: dbOk ? "up" : "down" });
  } catch {
    res.status(503).json({ ok: false, status: "degraded", database: "down" });
  }
});

router.use("/", publicRoutes);
router.use("/admin", adminRoutes);

export default router;
