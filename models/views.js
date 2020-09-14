module.exports = (sequelize, type) => {
    return sequelize.define('view_coll', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        old_view_id: type.BIGINT,
        old_view_name: type.STRING(200),
        new_view_id: type.BIGINT,
        new_view_name: type.STRING(200),
        view_json: type.TEXT,
        status: type.STRING(10),
        error_cause: type.STRING(500)
    })
}