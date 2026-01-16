const express = require("express");
const router = express.Router();
const controller = require("../controllers/searchController");

router.post("/", controller.handleSearch);

module.exports = router;
