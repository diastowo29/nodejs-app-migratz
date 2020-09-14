const axios = require('axios');
require('./base')
const { groupTable } = require('./sequelizer');
const { Op } = require("sequelize");

var zd_ticketfields_api = '/api/v2/groups.json'

var groupsOriginApi = generateApi(originDomain) + zd_ticketfields_api;
var groupsDestApi = generateApi(destDomain) + zd_ticketfields_api;

var counter = 0;

collectGroupList();

function collectGroupList () {
    axios({
        method: 'GET',
        url: groupsOriginApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {
        // console.log(response.status)

        var originGroupsDone = new Promise((resolve, reject) => {
            response.data.groups.forEach(async (group) => {
                await insertOrUpdateGroups(group);
                counter++;
                if (counter === response.data.groups.length) {
                    counter = 0;
                    resolve()
                }
            });
        });

        originGroupsDone.then(() => {
            axios({
                method: 'GET',
                url: groupsDestApi,
                auth: {
                    username: destUsername,
                    password: destPassword
                }
            }).then(function (response) {
                var destGroupsDone = new Promise((resolve, reject) => {
                    response.data.groups.forEach(async (group) => {
                        await compareGroups(group);
                        counter++;
                        if (counter === response.data.groups.length) {
                            counter = 0;
                            resolve()
                        }
                    });
                });

                destGroupsDone.then(() => {
                    // console.log('===== all is done =====')
                    doReplicateGroups();
                });
            });
        });
    });
}

function doReplicateGroups () {
    axios({
        method: 'GET',
        url: groupsOriginApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {
        groupTable.findAll({
            where: {
                destination_group_id: 0
            }
        }).then(group_found => {
            if (group_found !== null) {
                group_found.forEach(groupZero => {
                    response.data.groups.forEach(async (originGroup) => {
                        if (groupZero.dataValues.origin_group_id == originGroup.id) {
                            createGroup(originGroup)
                        }
                    });
                });
            } else {
                console.log('ALL GROUP HAS BEEN REPLICATED');
            }
        })
    })
}

function insertOrUpdateGroups (group) {
    return groupTable.findOne({
        where: {
            origin_group_id: group.id
        }
    }).then(groupTableFound => {
        if (groupTableFound === null) {
            return groupTable.create({
                origin_group_id: group.id,
                origin_group_name: group.name,
                destination_group_id: 0,
                destination_group_name: ''
            })
        } else {
            return groupTable.update({
                origin_group_name: group.name,
                destination_group_id: 0,
                destination_group_name: ''
            },{
                where: {
                    origin_group_id: group.id,
                }
            })
        }
    })
}

async function compareGroups (group) {
    var prefixName = originDomain + ' - ';
    return groupTable.findOne({
        where: {
            [Op.or]: [
                {
                    origin_group_name: group.name
                },
                {
                    origin_group_name: group.name.toString().replace(new RegExp(prefixName, 'g'), '')
                }
            ]
        }
    }).then(groupTableFound => {
        if (groupTableFound !== null) {
            return groupTable.update({
                destination_group_name: group.name,
                destination_group_id: group.id
            },{
                where: {
                    origin_group_id: groupTableFound.dataValues.origin_group_id,
                }
            })
        }
    })
}

async function createGroup (group) {
    group.name = originDomain + ' - ' + group.name
    console.log('create group : %s', group.name)
    return axios({
        method: 'POST',
        url: groupsDestApi,
        auth: {
            username: destUsername,
            password: destPassword
        },
        data: {
            group: group
        }
    }).then(function (response) {
        console.log('CREATE GROUP status: %s name: %s on %s',response.status, group.name, groupsDestApi);
        updateGroupsDb(response, group.id, group.name);
    }).catch(error => {
        console.log('ERROR CREATE status: %s name: %s on %s', error.response.status, group.name, groupsDestApi);
        updateGroupsDb(error.response, group.id, group.name);
    });
}

function updateGroupsDb (response, id, name) {
    groupTable.findOne({
        where: {
            origin_group_id: id
        }
    }).then(groupTableFound => {
        var createdGroupsId = 0;
        var createdGroupsName = '';
        var errorCause = '';

        if (response.status == 200 || response.status == 201) {
            createdGroupsId = response.data.group.id;
            createdGroupsName = response.data.group.name;
        } else {
            if (response.data.hasOwnProperty('details')) {
                errorCause = response.data.details.base[0].description 
                || response.data.details.toString();
            } else {
                errorCause = response.data.description;
            }
        }

        if (groupTableFound === null) {
            groupTable.create({
                origin_group_id: id,
                origin_group_name: name,
                destination_group_id: createdGroupsId,
                destination_group_name: createdGroupsName,
                status: response.status.toString(),
                error_cause: errorCause
            })
        } else {
            groupTable.update({
                destination_group_id: createdGroupsId,
                destination_group_name: createdGroupsName,
                status: response.status.toString(),
                error_cause: errorCause
            },{
                where: {
                    origin_group_id: groupTableFound.origin_group_id,
                }
            })
        }
    })
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}