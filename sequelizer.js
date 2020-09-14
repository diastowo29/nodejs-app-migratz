const Sequelize = require('sequelize')
const domainModel = require('./models/domain')
const groupModel = require('./models/group')
const tfieldsModel = require('./models/tfields')
const tformsModel = require('./models/tforms')
const usersModel = require('./models/users')
const triggersModel = require('./models/triggers')
const ticketMigrateLogModel = require('./models/ticket_migrate_log')
const viewModel = require('./models/views')

var sequelize_db;

if (process.env.DATABASE_URL === undefined) {
	sequelize_db = new Sequelize('migratz', 'postgres', 'R@hasia', {
	  host: 'localhost',
	  dialect: 'postgres',
	  logging: false
	});
} else {
	sequelize_db = new Sequelize(process.env.DATABASE_URL, {
		logging: false,
		dialectOptions: {
			ssl: {
				require: true,
				rejectUnauthorized: false,
		    },
		    keepAlive: true,
		},
		ssl: true
	})
}

const domainTable = domainModel(sequelize_db, Sequelize)
const groupTable = groupModel(sequelize_db, Sequelize)
const tfieldsTable = tfieldsModel(sequelize_db, Sequelize)
const tformsTable = tformsModel(sequelize_db, Sequelize)
const usersTable = usersModel(sequelize_db, Sequelize)
const triggerTable = triggersModel(sequelize_db, Sequelize)
const migrateLogTable = ticketMigrateLogModel(sequelize_db, Sequelize)
const viewTable = viewModel(sequelize_db, Sequelize)

sequelize_db.sync({ alter: true })
  .then(() => {
	//   console.log(`Database & tables created!`)
	})

module.exports = {
    domainTable,
	groupTable,
	tfieldsTable,
	tformsTable,
	usersTable,
	triggerTable,
	migrateLogTable,
	viewTable
}