const express = require("express");
const router = express.Router();
const medicineController = require("../controllers/MedicineController");
const { verifyToken, isAdmin } = require("../Middleware/Middleware");

router.post(
  "/medicines",
  medicineController.createMedicine,
  verifyToken,
  isAdmin
);
router.get("/medicines", medicineController.getAllMedicines, verifyToken);
router.put(
  "/medicines/:id",
  medicineController.updateMedicine,
  verifyToken,
  isAdmin
);
router.delete(
  "/medicines/:id",
  medicineController.deleteMedicine,
  verifyToken,
  isAdmin
);

module.exports = router;
