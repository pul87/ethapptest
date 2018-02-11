App = {
  web3Provider: null,
  contracts: {},
  account: 0x0,
  loading: false,

  init: function() {
      return App.initWeb3();
  },
  initWeb3: function() {

      // Initialize web3 and set the provider to testRPC
      // se il browser, grazie a metamask o altre estensioni ha già iniettato un'istanza di web3
      // allora recupero il currentProvider, lo salvo nell'oggetto App e creo una nuova istanza di Web3
      // non uso quella fornita perchè potrebbe essere una versione diversa da quella che ho scelto di includere
      // nell'applicazione.
      if(typeof web3 !== 'undefined') {
          App.web3Provider = web3.currentProvider;
          web3 = new Web3(web3.currentProvider);
      } else {
          // Se non esiste un'istanza di web3 iniettata dal browser, allora la creo facendola puntare al mio nodo
          App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
          web3 = new Web3(App.web3Provider);
      }
      App.displayAccountInfo();
      return App.initContract();
  },
  displayAccountInfo() {
      web3.eth.getCoinbase(function(err, account) {
          if(!err) {
              App.account = account;
              $('#account').text(account);
              web3.eth.getBalance(account, function(err, balance){
                 if(!err) {
                     $('#accountBalance').text(web3.fromWei(balance, "ether") + "ETH");
                 }
              });
          }
      })
  },
  // recupera ChainList.json, crea un contratto con TruffleContract e setta il provider al contratto.
  // Salvo un'istanza nell'oggetto App.contracts.
  initContract() {
      // posso ricercare direttamente ChainList perchè browser-sync e serve tutto quello che c'è nella cartella
      // src e quello che c'è nella cartella contracts, la configurazione è nel file bs-config.json nella root del progetto
      $.getJSON('ChainList.json', function(chainListArtifact) {
          App.contracts.ChainList = TruffleContract(chainListArtifact);
          App.contracts.ChainList.setProvider(App.web3Provider);

          // Listen to events
          App.listenToEvents();

          return App.reloadArticles();
      });
  },
  reloadArticles: function() {

         if(App.loading) {
             return;
         }

         App.loading = true;

         // refresh the account information because the balance may have changed
         App.displayAccountInfo();

         var chainListInstance;

         App.contracts.ChainList.deployed().then(function(instance) {
             chainListInstance = instance;
             return chainListInstance.getArticlesForSale();
         }).then(function(articleIDs) {
             var articlesRow = $('#articlesRow');

             articlesRow.empty();

             for(var i = 0; i < articleIDs.length; i++) {
                 var articleId = articleIDs[i];
                 chainListInstance.articles(articleId.toNumber()).then(function(article) {
                     App.displayArticle(
                         article[0], // id
                         article[1], // seller
                         article[2], // buyer
                         article[3], // name
                         article[4], // description
                         article[5]  // price
                     );
                 });
             }

             App.loading = false;
         })
         .catch(function(error) {
             console.error(error);
             App.loadig = false;
         });
 },
 displayArticle: function(id, seller, buyer, name, description, price) {
    var articlesRow = $('#articlesRow');

    var etherPrice = web3.fromWei(price, "ether");

    var articleTemplate = $('#articleTemplate');
    articleTemplate.find('.panel-title').text(name);
    articleTemplate.find('.article-description').text(description);
    articleTemplate.find('.article-price').text(etherPrice + " ETH");
    articleTemplate.find('.btn-buy').attr('data-id', id);
    articleTemplate.find('.btn-buy').attr('data-value', etherPrice);

    if(seller == App.account) {
        articleTemplate.find('.article-seller').text("You");
        articleTemplate.find('.btn-buy').hide();
    } else {
        articleTemplate.find('.article-seller').text(seller);
        articleTemplate.find('.btn-buy').show();
    }

    // add this new article
    articlesRow.append(articleTemplate.html());
 },
 sellArticle: function() {
     // Retrieve details of the article
     var _name          = $('#article_name').val();
     var _description   = $('#article_description').val();
     var _price         = web3.toWei(parseFloat($('#article_price').val() || 0), "ether");

     if((_name.trim() == '' || _price == 0 )) {
         // nothing to sell
         return false;
     }

     App.contracts.ChainList.deployed().then(instance => {
         return instance.sellArticle(_name, _description, _price, {
             from: App.account,
             gas: 500000
         })
         .then(function(result) {

         })
         .catch(function(err) {
             console.error(err);
         })
     });
 },
 // Listen for events raised from the contract
  listenToEvents: function() {
     App.contracts.ChainList.deployed().then(function(instance) {
     instance.sellArticleEvent({}, {
       fromBlock: 0,
       toBlock: 'latest'
     }).watch(function(error, event) {
       if (!error) {
         $("#events").append('<li class="list-group-item">' + event.args._name + ' is for sale' + '</li>');
       } else {
         console.error(error);
       }
       App.reloadArticles();
     });

     instance.buyArticleEvent({}, {
       fromBlock: 0,
       toBlock: 'latest'
     }).watch(function(error, event) {
       if (!error) {
         $("#events").append('<li class="list-group-item">' + event.args._buyer + ' bought ' + event.args._name + '</li>');
       } else {
         console.error(error);
       }
       App.reloadArticles();
     });
   });
  },
  buyArticle: function() {
      event.preventDefault();
      // retreive the price article
      var _id = parseInt($(event.target).data('id'));
      var _price = parseFloat($(event.target).data('value'));

      App.contracts.ChainList.deployed().then(function(instance) {
          return instance.buyArticle(_id, {
              from: App.account,
              value: web3.toWei(_price, "ether"),
              gas: 500000
          }).then(function(result) {

          }).catch(function(error) {
              console.error(error);
          });
      })
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
