module.exports = (sequelize, type) => {
    return sequelize.define('user_coll', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        origin_user_id: type.BIGINT,
        origin_user_name: type.STRING(50),
        new_user_id: type.BIGINT,
        new_user_name: type.STRING(50),
        status: type.STRING(10),
        error_cause: type.STRING(500)
    })
}