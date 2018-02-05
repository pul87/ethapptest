pragma solidity ^0.4.11;

contract ChainList {

    // Custom types
    struct Article {
        uint id;
        address seller;
        address buyer;
        string name;
        string description;
        uint256 price;
    }

    // State variables
    // mapping è una mappa, ma non può essere iterata, quindi semplicemente si
    // può solamente verificare se esitono i valori.
    // dato che dichiariamo il mapping come public il compilatore genererà in automatico un getter
    // per articles ma non un setter.
    mapping(uint => Article) public articles;
    uint articleCounter;
    address owner;

    // Events
    event sellArticleEvent(uint indexed _id, address indexed _seller, string _name, uint256 _price);
    event buyArticleEvent(uint indexed _id, address indexed _seller, address indexed _buyer, string _name, uint256 _price);

    function ChainList() public {
        owner = msg.sender;
    }


    function sellArticle(string _name, string _description, uint256 _price)
    public {
        // track a new article
        articleCounter++;

        // store this article
        articles[articleCounter] = Article(
                articleCounter,
                msg.sender,
                0x0,
                _name,
                _description,
                _price
        );

        // trigger the event
        sellArticleEvent(articleCounter, msg.sender, _name, _price);
    }

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    // fetch the number of articles in the contract
    function getNumberOfArticles() public constant returns (uint) {
        return articleCounter;
    }

    // fetch and returns all article IDs available for sale
    function getArticlesForSale() public constant returns (uint[]){
        // we check wheter there is at least an article for sale
        if(articleCounter == 0) {
            return new uint[](0);
        }

        // prepare output array
        uint[] memory articleIDs = new uint[](articleCounter);

        uint numberOfArticlesForSale = 0;

        // iterate over articles
        for(uint i = 1; i <= articleCounter; i++) {
            if(articles[i].buyer == 0x0) {
                articleIDs[numberOfArticlesForSale] = articles[i].id;
                numberOfArticlesForSale++;
            }
        }

        // copy the articleIDs array into the smaller forSale array
        uint[] memory forSale = new uint[](numberOfArticlesForSale);
        for(uint j = 0; j < numberOfArticlesForSale; j++) {
            forSale[j] = articleIDs[j];
        }
        return (forSale);
    }

    // buy an article
    // quando una funzione è "payable" può ricevere valore dal msg.sender
    function buyArticle(uint _id) payable public {
        // we check wheter there is at least an article
        require(articleCounter > 0);

        // we check wheter the article exists
        require(_id > 0 && _id <= articleCounter);

        // we retreive the Article
        Article storage article = articles[_id];

        // we check that the article was not already sold
        require(article.buyer == 0x0);

        // we don't allow the seller to buy it's own article
        require(msg.sender != article.seller);

        // we check wether the value sent corresponds to the article price
        require(msg.value == article.price);

        // keep buyer's information
        article.buyer = msg.sender;

        // the buyer can buy the article
        article.seller.transfer(msg.value);

        // trigger the buy event
        buyArticleEvent(_id, article.seller, article.buyer, article.name, article.price);
    }

    function kill() onlyOwner public {
        // refund all the remainings funds to the owner
        selfdestruct(owner);
    }
}
