module.exports = (sequelize, type) => {
  return sequelize.define('ticket_migrate_log', {
    id: {
      type: type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batch_id: type.STRING(50),
    timestamp: type.STRING(50),
    job_id: type.STRING(50),
    ticket_index: type.INTEGER,
    ticket_id: type.BIGINT,
    new_ticket_id: type.BIGINT,
    status: type.STRING(10),
    error_cause: type.STRING(500)
  });
}