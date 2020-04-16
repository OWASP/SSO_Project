const {User, Audit} = require("../utils");

class AuditFlow {
	getMe(req, res) {
		User.findUserById(req.user.id).then(userData => {
			const {password, last_login, created, ...publicAttributes} = userData;
			publicAttributes.authenticators.forEach(v => {
				delete v.userCounter;
				delete v.userKey;
			});
			const token = req.user.token;
			
			if(token) {
				User.validateSession(token).then(() => {
					publicAttributes.isAuthenticated = true;
					res.json(publicAttributes);
				});
			} else {
				publicAttributes.isAuthenticated = false;
				res.json(publicAttributes);
			}
		});
	}
	
	getAuditLogs(req, res) {
		const currentPage = parseInt(req.query.page) || 0;
		const pageSize = parseInt(process.env.AUDITPAGELENGTH) || 5;
		
		Audit.getList(req.user.id, currentPage*pageSize, pageSize).then(results => {
			res.json(results);
		}).catch(err => {
			res.status(500).send(err);
		});
	}
	
	reportAuditLog(req, res, next) {
		const auditId = parseInt(req.body.id);
		if(!auditId) {
			return res.status(400).send("No ID provided");
		}
		
		Audit.get(auditId).then(rows => {
			if(!rows.length || rows[0].user != req.user.id) {
				return res.status(404).send("Audit ID does not exist"); // to make sure you can not enumerate them
			}
			
			Audit.add(req, "session", "report", req.body.id).then(() => {
				// No need to close all sessions here, as we can just trigger a click to close other sessions in the frontend
				next();
			});
		}).catch(err => {
			return res.status(404).send("Audit ID does not exist");
		});
	}
}

exports.auditFlow = AuditFlow;