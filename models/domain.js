module.exports = (sequelize, type) => {
    return sequelize.define('domain_config', {
        id: {
          type: type.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        origin_domain: type.STRING(50),
        origin_username: type.STRING(50),
        origin_password: type.STRING(50),
        destination_domain: type.STRING(50),
        destination_username: type.STRING(50),
        destination_password: type.STRING(50)
    })
}