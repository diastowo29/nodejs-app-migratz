module.exports = (sequelize, type) => {
    return sequelize.define('tforms_coll', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        origin_tforms_id: type.BIGINT,
        origin_tforms_name: type.STRING(50),
        origin_tforms_active: type.BOOLEAN,
        destination_tforms_id: type.BIGINT,
        destination_tforms_name: type.STRING(50),
        status: type.STRING(10),
        error_cause: type.STRING(500)
    })
}