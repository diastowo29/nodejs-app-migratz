module.exports = (sequelize, type) => {
    return sequelize.define('trigger_coll', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        old_trigger_id: type.BIGINT,
        old_trigger_name: type.STRING(200),
        new_trigger_id: type.BIGINT,
        new_trigger_name: type.STRING(200),
        trigger_json: type.TEXT,
        status: type.STRING(10),
        error_cause: type.STRING(500)
    })
}