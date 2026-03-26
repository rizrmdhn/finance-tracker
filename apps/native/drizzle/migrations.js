// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from "./0000_yummy_xorn.sql";
import m0001 from "./0001_flaky_domino.sql";
import m0002 from "./0002_sleepy_roughhouse.sql";
import m0003 from "./0003_loose_thanos.sql";
import m0004 from "./0004_right_ink.sql";
import m0005 from "./0005_unknown_puppet_master.sql";
import m0006 from "./0006_misty_daimon_hellstrom.sql";
import journal from "./meta/_journal.json";

export default {
	journal,
	migrations: {
		m0000,
		m0001,
		m0002,
		m0003,
		m0004,
		m0005,
		m0006,
	},
};
