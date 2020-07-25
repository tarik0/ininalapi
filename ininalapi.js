
/*
 * Private Ininal API v1
 * Coded by Cool Guy
*/

const request = require('request-promise');
const UserAgent = require("user-agents");
const EventEmitter = require('events');
const parse = require("node-html-parser").parse;

const IninalHomeURL = "https://onis.ininal.com";
const IninalLoginURL = "https://onis.ininal.com/login";
const IninalOtpURL = "https://onis.ininal.com/otp";
const IninalCardListURL = "https://onis.ininal.com/kart/list";

class IninalApi extends EventEmitter {
    constructor(email, password, proxy) {
        // Defining variables
        super();
        this.email = email;
        this.password = password;
        this.proxy = proxy;
        this
        this.runHeartBeat = true;

        // Set proxy
        if (proxy != null) {
            request = request.defaults({"proxy": proxy})
        }

        // Creating new session jar
        this.cookieJar = request.jar();
        this.headers = {
            "User-Agent": new UserAgent().toString(),
        }
    }

    async login() {
        // Get session id
        let res =  await request.get({
            url: IninalHomeURL, 
            jar: this.cookieJar,
            resolveWithFullResponse: true
        });
        
        if (res.statusCode != 200) {
            throw new StatusNotOKException(res.statusCode);
        }
        
        // Post login
        res = await request.post({
            url: IninalLoginURL,
            jar: this.cookieJar,
            resolveWithFullResponse: true,
            form: {
                "loginRequest.email": this.email,
                "loginRequest.password": this.password
            },
            json: true
        });

        if (res.statusCode != 200) {
            throw new StatusNotOKException(res.statusCode);
        }

        // Check error
        if (res.body.hasOwnProperty("error")){
            throw new LoginException(res.body.error);
        }

        if (res.body.text == "success" && res.body.url == "/otp"){
            this.emit("needSms");
            return;
        }
    }

    async sendOtp(smsCode) {
        // Get cookies
        let res =  await request.get({
            url: IninalOtpURL, 
            jar: this.cookieJar,
            resolveWithFullResponse: true
        });
        
        if (res.statusCode != 200) {
            throw new StatusNotOKException(res.statusCode);
        }
        
        // Post sms code
        res = await request.post({
            url: IninalOtpURL,
            jar: this.cookieJar,
            resolveWithFullResponse: true,
            form: {
                "smscode": smsCode
            },
            json: true
        });

        if (res.statusCode != 200) {
            throw new StatusNotOKException(res.statusCode);
        }

        // Check error
        if (res.body.hasOwnProperty("error")){
            throw new OTPException(res.body.error);
        }

        if (res.body.text == "success" && res.body.url == "/kart/index"){
            // Start hearbeat interval
            this.heartBeatInterval = setInterval(async () => {
                try {
                    this.wallet = await this.getCardsWithBalance();
                    this.emit("walletUpdated");
                } catch {
                    this.emit("loggedOut");
                    this.dispose();
                };
            }, 15000);

            this.wallet = await this.getCardsWithBalance();
            this.emit("loggedIn");
            return;
        }
    }

    async getCardsWithBalance() {
        // Get session id
        let res =  await request.post({
            url: IninalCardListURL, 
            jar: this.cookieJar,
            resolveWithFullResponse: true,
            form:{}
        });
        
        if (res.statusCode != 200) {
            throw new StatusNotOKException(res.statusCode);
        }

        let html = parse("<html><body>" + res.body.replace("\n","") + "</body></html>");
        
        let htmlChilds = html.querySelector(".card-list").childNodes;
        let wallet = {};
        for (let i = 0; i != htmlChilds.length; i++) {
            let card = htmlChilds[i];

            if (card.tagName != "li") {
                continue;
            }

            let balance = parseFloat(card.childNodes[3].rawText.replace(" ", "").replace("TL", ""));
            let link = card.childNodes[5].firstChild.getAttribute("href").replace("/kart/hesap-hareketleri/", "");
            wallet[link] = balance;
        }

        return wallet;
    }

    dispose(){
        clearInterval(this.heartBeatInterval);
    }
}

class StatusNotOKException extends Error {
    constructor(message) { super(message); this.name = this.constructor.name; Error.captureStackTrace(this, this.constructor); }
};

class LoginException extends Error {
    constructor(message) { super(message); this.name = this.constructor.name; Error.captureStackTrace(this, this.constructor); }
};

class OTPException extends Error {
    constructor(message) { super(message); this.name = this.constructor.name; Error.captureStackTrace(this, this.constructor); }
};

module.exports.IninalApi = IninalApi;
module.exports.StatusNotOKException = StatusNotOKException;
module.exports.LoginException = LoginException;
module.exports.OTPException = OTPException;

/*
Example;

const readline = require('readline');
var ininal = new IninalApi("email", "pass", null);

ininal.once("needSms", () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Sms Code: ', (answer) => {
        ininal.sendOtp(answer);
      
        rl.close();
    });
})

ininal.on("loggedIn", () => {
    console.log("Logged in!!");
});

ininal.on("walletUpdated", () => {
    console.log("wallet updated!");
    console.log(ininal.wallet)
});

ininal.on("loggedOut", () => {
    console.log("Logged out!");
    ininal = new IninalApi("email", "pass", null);
    ininal.login().catch(console.log);
})

ininal.login().catch(console.log)
*/