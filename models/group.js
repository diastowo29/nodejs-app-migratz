module.exports = (sequelize, type) => {
    return sequelize.define('group_coll', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        origin_group_id: type.BIGINT,
        origin_group_name: type.STRING(50),
        destination_group_id: type.BIGINT,
        destination_group_name: type.STRING(50),
        status: type.STRING(10),
        error_cause: type.STRING(500)
    })
}