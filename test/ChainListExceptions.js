var ChainList = artifacts.require('./ChainList.sol');

contract('ChainList', (accounts) => {
    var chainListInstance;
    var seller = accounts[1];
    var buyer = accounts[2];
    var articleName = "Article 1";
    var articleDescription = "Description for article 1";
    var articlePrice = 10;

    // Test case: no article for sale yet
    it("should throw an exception if you try to buy an article when there is no article for sale", () => {
        return ChainList.deployed().then((instance) => {
            chainListInstance = instance;
            return chainListInstance.buyArticle({
                from: buyer,
                value: web3.toWei(articlePrice, "ether")
            });
        }).then(assert.fail)
        .catch(error => {
            assert(error.message.indexOf('revert') >= 0, "error should be revert");
        }).then(() => {
            return chainListInstance.getArticle.call();
        }).then((data) => {
            // make sure the contract state was not altered
            assert.equal(data[0], 0x0, "seller must be empty");
            assert.equal(data[1], 0x0, "buyer must be empty");
            assert.equal(data[2], '', "article must be empty");
            assert.equal(data[3], '', "article description must be empty");
            assert.equal(data[4].toNumber(), 0, "article price must be 0");
        });
    });

    // Test case: buying an article you are selling
    it("should throw an exception if you try to buy your own article", () => {
        return ChainList.deployed().then(instance => {
            chainListInstance = instance;
            return chainListInstance.sellArticle(articleName, articleDescription, web3.toWei(articlePrice, "ether"), {
                from: seller
            });
        }).then(receipt => {
            return chainListInstance.buyArticle({
                from: seller,
                value: web3.toWei(articlePrice, "ether")
            });
        }).then(assert.fail)
        .catch(error => {
            assert(error.message.indexOf('revert') >= 0, "error shoul be revert")
        }).then(() => {
            return chainListInstance.getArticle.call();
        }).then(data => {
            // make sure the contract state was not altered
            assert.equal(data[0], seller, "seller must be " + seller);
            assert.equal(data[1], 0x0, "buyer must be empty");
            assert.equal(data[2], articleName, "article must be " + articleName);
            assert.equal(data[3], articleDescription, "article description must be " + articleDescription);
            assert.equal(data[4].toNumber(), web3.toWei(articlePrice, "ether"), "article price must be " + web3.toWei(articlePrice, "ether"));
        });
    });

    // Test case: incorrect value
    it("should throw an exception if you try to buy an article for a value different from its price", () => {
        return ChainList.deployed().then((instance) => {
            chainListInstance = instance;
            return chainListInstance.buyArticle({
                from: buyer,
                value: web3.toWei(articlePrice + 1, "ether")
            });
        }).then(assert.fail)
        .catch(error => {
            assert(error.message.indexOf('revert') >= 0, "error should be revert");
        }).then(() => {
            return chainListInstance.getArticle.call();
        }).then(data => {
            // make sure the contract state was not altered
            assert.equal(data[0], seller, "seller must be " + seller);
            assert.equal(data[1], 0x0, "buyer must be empty");
            assert.equal(data[2], articleName, "article must be " + articleName);
            assert.equal(data[3], articleDescription, "article description must be " + articleDescription);
            assert.equal(data[4].toNumber(), web3.toWei(articlePrice, "ether"), "article price must be " + web3.toWei(articlePrice, "ether"));
        });
    });

    // Test case: article has already been sold
    it("should throw an exception if you try to buy an article that has already been sold", () => {
        return ChainList.deployed().then(instance => {
            chainListInstance = instance;
            return chainListInstance.buyArticle({
                from: buyer,
                value: web3.toWei(articlePrice, "ether")
            });
        })
        .then(() => {
            return chainListInstance.buyArticle({
                from: web3.accounts[0],
                value: web3.toWei(articlePrice, "ether")
            });
        }).then(assert.fail)
        .catch(error => {
            assert(error.message.indexOf('invalid opcode'), "error shoul be invalid opcode");
        }).then(() => {
            return chainListInstance.getArticle.call();
        }).then(data => {
            assert.equal(data[0], seller, "seller must be " + seller);
            assert.equal(data[1], buyer, "buyer must be " + buyer);
            assert.equal(data[2], articleName, "article must be " + articleName);
            assert.equal(data[3], articleDescription, "article description must be " + articleDescription);
            assert.equal(data[4].toNumber(), web3.toWei(articlePrice, "ether"), "article price must be " + web3.toWei(articlePrice, "ether"));
        });
    });
});
