const MailChimp = require('mailchimp-api-v3'),
      MailInstance = new MailChimp(process.env.MC_API_KEY),
      limitPerRequest = 200;

const mailchimp = {
  cachedUsers: {
    last_updated: null,
    users: []
  },
  getAllLists() {
    return MailInstance.get('/lists', { count: 50, fields: 'lists.id,lists.stats.member_count' });
  },
  getAllSubscribers(result) {
    const allLists = result.lists.filter(value => value.stats.member_count).map(value => ({
      path: `/lists/${value.id}/members`,
      total: value.stats.member_count
    }));
    const calls = [];

    for (let i = 0; i < allLists.length; i++) {
      const totalCalls = Math.ceil(allLists[i].total / limitPerRequest);
      for (let k = 0; k < totalCalls; k++) {
        calls.push({
          method: 'get',
          path: allLists[i].path,
          query: {
            count: limitPerRequest,
            offset: (k * limitPerRequest),
            status: 'subscribed',
            fields: 'members.email_address,members.merge_fields,members.email_type'
          }
        });
      }
    }

    return MailInstance.batch(calls, { interval: 5000, unpack: true });
  },
  filterUsers(users, topicId) {
    let masterList = [];

    for (let i = 0; i < users.length; i++) {
      if(users[i].members) {
        masterList = masterList.concat(users[i].members);
      }
    }

    return masterList.filter(value => value.merge_fields && value.merge_fields.AEID).filter(value => value.merge_fields.AEID.split(',').includes(topicId.toString()));
  },
  async setCachedUsers(users) {
    this.cachedUsers = {
      last_updated: new Date(),
      users
    };
  },
  getCachedUsers() {
    return this.cachedUsers;
  }
};

module.exports = mailchimp;
