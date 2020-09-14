const axios = require('axios');
require('./base')
const { triggerTable, groupTable, tfieldsTable, tformsTable } = require('./sequelizer');

var zd_triggers_api = '/api/v2/triggers.json'

var triggersOldApi = generateApi(originDomain) + zd_triggers_api;
var triggersNewApi = generateApi(destDomain) + zd_triggers_api;

collectTriggersList();
var counter = 0;

function collectTriggersList () {
    axios({
        method: 'GET',
        url: triggersOldApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {
        response.data.triggers.forEach(async trigger => {
            await triggerTable.findOne({
                where: {
                    old_trigger_id: trigger.id
                }
            }).then(async (triggerFound) => {
                if (triggerFound === null) {
                    console.log('CREATE TRIGGER: %s', trigger.title);
                    await triggerTable.create({
                        old_trigger_id: trigger.id,
                        old_trigger_name: trigger.title,
                        new_trigger_id: 0,
                        trigger_json: JSON.stringify(trigger)
                    }).then(() => {
                        counter++;
                        if (counter == response.data.triggers.length) {
                            findSameTrigger();
                        }
                    })
                } else {
                    await triggerTable.update({
                        old_trigger_id: trigger.id,
                        old_trigger_name: trigger.title,
                        new_trigger_id: 0,
                        trigger_json: JSON.stringify(trigger)
                    }, {
                        where: {
                            id: triggerFound.dataValues.id
                        }
                    }).then(() => {
                        counter++;
                        if (counter == response.data.triggers.length) {
                            findSameTrigger();
                        }
                    })
                }
            })
        });
    });
}

function findSameTrigger () {
    counter = 0;
    console.log('===== FIND TRIGGER WITH SAME NAME =====')
    axios({
        method: 'GET',
        url: triggersNewApi,
        auth: {
            username: destUsername,
            password: destPassword
        }
    }).then(function (response) {
        triggerTable.findAll({
            wher: {
                new_trigger_id: 0
            }
        }).then(allZeroTriggers => {
            allZeroTriggers.forEach(zeroTrigger => {
                var triggerMatch = false;
                console.log('CHECKING TRIGGER: ', zeroTrigger.dataValues.old_trigger_name)
                response.data.triggers.forEach(trigger => {
                    if (zeroTrigger.dataValues.old_trigger_name == trigger.title) {
                        triggerMatch = true;
                        console.log('FOUND TRIGGER: %s', trigger.title);
                        triggerTable.update({
                            new_trigger_id: trigger.id,
                            new_trigger_name: trigger.title
                        },{
                            where: {
                                id: zeroTrigger.dataValues.id
                            }
                        }).then(() => {
                            counter++;
                            if (counter == allZeroTriggers.length) {
                                menipulateTrigger()
                            }
                        });
                    }
                });
                if (!triggerMatch) {
                    counter++;
                    if (counter == allZeroTriggers.length) {
                        menipulateTrigger()
                    }
                }
            });
        })
    })
}

function menipulateTrigger () {
    console.log('do manipulate')
    tfieldsTable.findAll().then(allTfields => {
        tformsTable.findAll().then(allTforms => {
            groupTable.findAll().then(allGroups => {
                triggerTable.findAll({
                    where: {
                        new_trigger_id: 0
                    }
                }).then(allZeroTriggers => {
                    allZeroTriggers.forEach(zeroTrigger => {
                        var triggerJson = JSON.parse(zeroTrigger.dataValues.trigger_json.toString());
                        // console.log(triggerJson.title);
                        if (triggerJson.actions.length > 0) {
                            triggerJson.actions = triggerDeepManipulate(triggerJson.actions, allTfields, allTforms, allGroups);
                        }

                        if (triggerJson.conditions.all.length > 0) {
                            triggerJson.conditions.all = triggerDeepManipulate(triggerJson.conditions.all, allTfields, allTforms, allGroups);
                        }

                        
                        if (triggerJson.conditions.any.length > 0) {
                            triggerJson.conditions.any = triggerDeepManipulate(triggerJson.conditions.any, allTfields, allTforms, allGroups);
                        }

                        if (triggerJson.title == 'Notify') {
                            console.log(JSON.stringify(triggerJson))
                        }
                    });
                })
            })
        })
    })
}

function triggerDeepManipulate (triggerLogic, allTfields, allTforms, allGroups) {
    triggerLogic.forEach((logic, logicIndex) => {
        var valueMatch = false;

        if (logic.field.includes('custom_fields_')) {
            var customFieldsId = parseInt(logic.field.split('_')[2]);
            allTfields.forEach(tFields => {
                if (tFields.dataValues.origin_tfields_id == customFieldsId) {
                    triggerLogic[logicIndex].field = 'custom_fields_' + tFields.dataValues.destination_tfields_id;
                }
            });
        }

        if (!isNaN(parseInt(logic.value))) {
            // console.log(triggerJson.title)
            allTfields.forEach(tFields => {
                if (parseInt(logic.value) == tFields.dataValues.origin_tfields_id) {
                    valueMatch = true;
                    triggerLogic[logicIndex].value = tFields.dataValues.destination_tfields_id || 0;
                }
            });

            if (!valueMatch) {
                allTforms.forEach(tForms => {
                    if (parseInt(logic.value) == tForms.dataValues.origin_tforms_id) {
                        valueMatch = true;
                        triggerLogic[logicIndex].value = tForms.dataValues.destination_tforms_id || 0;
                    }
                });
            }

            if (!valueMatch) {
                allGroups.forEach(group => {
                    if (parseInt(logic.value) == group.dataValues.origin_group_id) {
                        valueMatch = true;
                        triggerLogic[logicIndex].value = group.dataValues.destination_group_id || 0;
                    }
                });
            }
        }
    });
    return triggerLogic;
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}