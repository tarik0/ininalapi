
/*
 * Private Ininal Query System v1
 * Coded by Cool Guy#0101
*/

const EventEmitter = require('events');

class IninalQuery extends EventEmitter {
    constructor () {
        super();
        this.query = [];
        this.lastQueryDone = true;

        this.checkQueryInterval = setInterval(() => {
            if (this.lastQueryDone && this.query.length != 0) {
                this.lastQueryDone = false;
                let query = this.query[0];
                this.emit("newQuery", query.userId, query.order);
            }
        }, 100);
    }

    addToQuery(userId, order) {
        this.query.push({userId: userId, order: order});
    }

    removeFromQuery(userId){
        for (let i = 0; i < this.query.length; i++) {
            let query = this.query[i];
            if (query && query.userId == userId) {
                this.query.splice(i, 1);
            }
        }
    }

    nextQuery() {
        if (this.query.length != 0) {
            this.query.shift();
        }
        this.lastQueryDone = true;
    }

    dispose(){
        clearInterval(this.checkQueryInterval);
    }
}

module.exports.IninalQuery = IninalQuery;

/*
Example;

ininalQuery = new IninalQuery();

ininalQuery.on("newQuery", (userId, order) => {
    console.log("New Query!", userId, order)

    setTimeout(() => {
        ininalQuery.nextQuery();
    }, 3000)
});

ininalQuery.addToQuery("id1", "order1");
ininalQuery.addToQuery("id2", "order2");
ininalQuery.addToQuery("id3", "order3");

ininalQuery.removeFromQuery("id3");

setTimeout(() => {
    ininalQuery.addToQuery("id4", "order4");
}, 3000);
*/
