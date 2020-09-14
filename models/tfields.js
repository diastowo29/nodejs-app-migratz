module.exports = (sequelize, type) => {
    return sequelize.define('tfields_coll', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        origin_tfields_id: type.BIGINT,
        origin_tfields_name: type.STRING(50),
        destination_tfields_id: type.BIGINT,
        destination_tfields_name: type.STRING(50),
        status: type.STRING(10),
        error_cause: type.STRING(500)
    })
}