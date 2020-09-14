const axios = require('axios');
const _ = require("lodash");
require('./base')
const { groupTable, tfieldsTable, tformsTable, usersTable, migrateLogTable } = require('./sequelizer');

var pageLimit = 2;
var pageCounter = 0;
var dataPerPage = 5;
var zd_ticket_api = '/api/v2/incremental/tickets.json?per_page=' + dataPerPage + '&start_time=1&include=users';
var zd_ticketimport_api = '/api/v2/imports/tickets/create_many.json';
var zd_ticketcomments_api = '/api/v2/tickets/';

var ticketOriginApi = generateApi(originDomain) + zd_ticket_api;
var ticketImportApi = generateApi(destDomain) + zd_ticketimport_api;

var defaultAgent = 419676627953;

var ticketColl = [];


collectTicketList(ticketOriginApi);

function collectTicketList (ticketApi) {
    pageCounter++;
    axios({
        method: 'GET',
        url: ticketApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {
        ticketColl = [];
        groupTable.findAll().then(allGroup => {
            tfieldsTable.findAll().then(allTfields => {
                tformsTable.findAll().then(allTforms => {
                    usersTable.findAll().then(allUsers => {
                        var mappingUsers = new Promise((resolve, reject) => {
                            var counter = 0;
                            response.data.users.forEach(userIn => {
                                usersTable.findOne({
                                    where: {
                                        origin_user_id: userIn.id
                                    }
                                }).then(async (userFound) => {
                                    if (userFound === null) {
                                        console.log('MIGRATING USER: %s', userIn.name)
                                        usersTable.create({
                                            origin_user_id: userIn.id,
                                            origin_user_name: userIn.name,
                                            new_user_id: 0
                                        }).then(async (userCreated) => {
                                            await createOrUpdateUser(userIn);
                                            counter++;
                                            if (counter == response.data.users.length) {
                                                resolve();
                                            }
                                        })
                                    } else {
                                        if (userFound.dataValues.new_user_id == 0) {
                                            console.log('MIGRATING USER: %s', userIn.name)
                                            await createOrUpdateUser(userIn);
                                            counter++;
                                            if (counter == response.data.users.length) {
                                                resolve();
                                            }
                                        } else {
                                            counter++;
                                            if (counter == response.data.users.length) {
                                                resolve();
                                            }
                                        }
                                    }
                                })
                            });
                        });
    
                        mappingUsers.then(async () => {
                            console.log('===== MAPPING USER DONE =====')
                            var manipulateTicket = new Promise((resolve, reject) => {
                                var ticketCounter = 0;
                                response.data.tickets.forEach(async (ticket, ticketIdx) => {
                                    ticket.external_id = ticket.id;

                                    // var groupFound = false;
                                    // if (ticket.group_id !== null) {
                                    //     allGroup.forEach(oldGroup => {
                                    //         if (ticket.group_id == oldGroup.dataValues.origin_group_id) {
                                    //             groupFound = true
                                    //             response.data.tickets[ticketIdx].group_id = parseInt(oldGroup.dataValues.destination_group_id);
                                    //         }
                                    //     });
                                    // }
                                    // if (!groupFound) {
                                    //     response.data.tickets[ticketIdx].group_id = null
                                    // }
                                    
                                    if (ticket.ticket_form_id !== null) {
                                        allTforms.forEach(oldForms => {
                                            if (ticket.ticket_form_id == oldForms.dataValues.origin_tforms_id) {
                                                response.data.tickets[ticketIdx].ticket_form_id = parseInt(oldForms.dataValues.destination_tforms_id);
                                            }
                                        });
                                    }
            
                                    ticket.custom_fields.forEach((ticketFields, fieldsIdx) => {
                                        allTfields.forEach(oldFields => {
                                            if (ticketFields.id == oldFields.dataValues.origin_tfields_id) {
                                                response.data.tickets[ticketIdx].custom_fields[fieldsIdx].id = parseInt(oldFields.dataValues.destination_tfields_id);
                                            }
                                        });
                                    });
            
                                    if (ticket.requester_id != null) {
                                        allUsers.forEach(users => {
                                            if (ticket.requester_id == users.dataValues.origin_user_id) {
                                                response.data.tickets[ticketIdx].requester_id = users.dataValues.new_user_id;
                                            }
                                        });
                                    }

                                    var downgradeAgent = false;
                                    if (ticket.assignee_id != null) {
                                        response.data.users.forEach(usersTicket => {
                                            if (ticket.assignee_id == usersTicket.id) {
                                                if (usersTicket.role == 'end-user') {
                                                    downgradeAgent = true;
                                                }
                                            }
                                        });

                                        if (downgradeAgent) {
                                            delete ticket['assignee_id'];
                                        } else {
                                            allUsers.forEach(users => {
                                                if (ticket.assignee_id == users.dataValues.origin_user_id) {
                                                    response.data.tickets[ticketIdx].assignee_id = users.dataValues.new_user_id;
                                                }
                                            });
                                        }
                                    }
    
                                    if (ticket.submitter_id != null) {
                                        allUsers.forEach(users => {
                                            if (ticket.submitter_id == users.dataValues.origin_user_id) {
                                                response.data.tickets[ticketIdx].submitter_id = users.dataValues.new_user_id;
                                            }
                                        });
                                    }
    
            
                                    delete ticket['fields'];
                                    delete ticket['satisfaction_rating'];
                                    delete ticket['group_id'];

                                    /* NO BRAND RN */
                                    delete ticket['brand_id']
            
                                    if (ticket.status != 'deleted') {
                                        var ticketComment = await getTicketComments(ticket.id)
                                        console.log('done get ticket comment: %s', ticket.id)
                                        var ticketComments = [];
                                        ticketComment.comments.forEach(comment => {
                                            var newAuthor = 0;
                                            allUsers.forEach(users => {
                                                if (comment.author_id == users.dataValues.origin_user_id) {
                                                    newAuthor = users.dataValues.new_user_id;
                                                }
                                            });

                                            if (newAuthor == 0) {
                                                newAuthor = defaultAgent;
                                            }
                                            ticketComments.push({
                                                author_id: newAuthor,
                                                value: comment.body,
                                                public: comment.public,
                                                created_at: comment.created_at
                                            })
                                        });

                                        response.data.tickets[ticketIdx]['comments'] = ticketComments;
                                        ticketColl.push(ticket);
                                        ticketCounter++;
                                        if (ticketCounter == response.data.tickets.length) {
                                            resolve();
                                        }
                                    } else {
                                        ticketCounter++;
                                        if (ticketCounter == response.data.tickets.length) {
                                            resolve();
                                        }
                                    }
                                });
                            });

                            manipulateTicket.then(() => {
                                // console.log(ticketColl.length > 0)
                                if (ticketColl.length > 0) {
                                    migrateTicket(ticketColl);
                                }

                                if (pageCounter < pageLimit) {
                                    if (response.data.next_page !== null) {
                                        collectTicketList(response.data.next_page);
                                    }
                                }
                            });
                        });
                    });
                });
            });
        });
    });
}

async function getTicketComments (id) {
    return axios({
        method: 'GET',
        url: generateCommentsApi(originDomain, id),
        auth: {
            username: destUsername,
            password: destPassword
        }
    }).then(function (response) {
        // console.log(response.status)
        return response.data;
    }).catch(function (error) {
        /* ERROR ON error.response.data */
        console.log(error.response)
    });
}

function migrateTicket (tickets) {
    var batch = Math.random().toString(36).substring(7);
    var timestamp = 0;
    var simpleCounter = 0;
    var ticketLength = tickets.length;
    var mappingTickets = new Promise((resolve, reject) => {
        tickets.forEach(async (ticket, ticketIndex) => {
            if (ticketIndex == 0) {
                timestamp = ticket.generated_timestamp;
            }
            const [ticketRow, created] = await migrateLogTable.findOrCreate({
                where: {
                    ticket_id: ticket.id
                },
                defaults: {
                    batch_id: batch,
                    timestamp: timestamp,
                    ticket_index: ticketIndex,
                    status: 'PENDING'
                }
            });
            if (!created) {
                // delete tickets[ticketIndex];
                tickets.splice(ticketIndex, 1, {})
                console.log('REMOVE TICKET FROM ARRAY ID: %s', ticket.id);
            }
            simpleCounter++;
            if (simpleCounter == ticketLength) {
                resolve();
            }
        });
    });

    mappingTickets.then(() => {
        // _.remove(tickets, function(t) {
        //     return t == null;
        // });
        // console.log(tickets)
        console.log('MAPPING TICKET SUCCESS');
        console.log('MIGRATE TOTAL %s TICKETS', tickets.length);

        axios({
            method: 'POST',
            url: ticketImportApi,
            auth: {
                username: destUsername,
                password: destPassword
            },
            data: {
                tickets: tickets
            }
        }).then(function (response) {
            // console.log(response.data.job_status.id);
            console.log(response.data.job_status.url);
            migrateLogTable.update({
                job_id: response.data.job_status.id
            },{
                where: {
                    batch_id: batch
                }
            });
        }).catch(function (error) {
            /* ERROR ON error.response.data */
            console.log(error.response);
        })
    })
}

async function createOrUpdateUser (user) {
    var userCreateUpdateApi = generateApi(destDomain) + '/api/v2/users/create_or_update.json'
    var newUser = {
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        external_id: user.id
    }
    var userCreated = null;
    return axios({
        method: 'POST',
        url: userCreateUpdateApi,
        auth: {
            username: destUsername,
            password: destPassword
        },
        data: {
            user: newUser
        }
    }).then(function (response) {
        // console.log(response.status)
        userCreated = response;
        return usersTable.update({
            new_user_id: response.data.user.id,
            new_user_name: response.data.user.name
        },{
            where: {
                origin_user_id: user.id
            }
        });
        // return response;
    }).catch(function (error) {
        console.log(error)
        userCreated = error.response
        return usersTable.update({
            status: error.status,
            new_user_name: error.response.data
        },{
            where: {
                origin_user_id: user.id
            }
        });
    })
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}

function generateCommentsApi (domain, id) {
    return 'https://' + domain + '.zendesk.com' + zd_ticketcomments_api + id  + '/comments.json';
}