const mysql = require("mysql2");

const db = mysql.createConnection({
	host: process.env.DBHOST || "localhost",
	user: process.env.DBUSER || "owasp_sso",
	database: process.env.DBDATABASE || "owasp_sso",
	password: process.env.DBPASS || "insecure-default-password",
});

const sqlPromise = (query, arguments) => {
	return new Promise((resolve, reject) => {
		db.execute(query, arguments, (err, results) => {
			if(err) {
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
};

module.exports = (on, config) => {
	on("task", {
		// Run SQL query
		sql(query, arguments) {
			return sqlPromise;
		},
		// Run multiple SQL queries
		sqlBulk(listData) {
			const listPromises = [];
			for(let i=0;i<listData.length;i++) {
				const thisData = listData[i];
				let query, args = [];
				
				console.log(thisData, typeof thisData);
				if(typeof thisData == "string") {
					query = thisData;
				} else if(Array.isArray(thisData)) {
					query = thisData[0];
					if(thisData.length > 1) {
						args = (typeof thisData[1] == "array") ? thisData[1] : [thisData[1]];
					}
				} else {
					throw new Exception("Unknown data type for bulk SQL");
				}
				
				listPromises.push(sqlPromise(query, args));
			}
			
			return Promise.all(listPromises);
		},
	});
}
