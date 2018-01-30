App = {
  web3Provider: null,
  contracts: {},
  account: 0x0,

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
      // refresh account info
      App.displayAccountInfo();

      App.contracts.ChainList.deployed().then(function(instance) {
         return instance.getArticle.call();
     }).then(function(article) {
         if(article[0] == 0x0) {
             // no article
             return;
         }

         // Retreive and clear the article placeholder
         var articlesRow = $('#articlesRow');
         articlesRow.empty();

         // Retreive and fill the article template
         var articleTemplate = $('#articleTemplate');
         articleTemplate.find('.panel-title').text(article[1]);
         articleTemplate.find('.article-description').text(article[2]);
         articleTemplate.find('.article-price').text(web3.fromWei(article[3], "ether"));

         var seller = article[0];

         if(seller == App.account) {
             seller = "You";
         }

         articleTemplate.find('.article-seller').text(seller);

         articlesRow.append(articleTemplate.html());
     }).catch(function(err) {
         console.log(err.message);
     });
 },
 sellArticle: function() {
     // Retrieve details of the article
     var _name          = $('#article_name').val();
     var _description   = $('#article_description').val();
     var _price         = web3.toWei(parseInt($('#article_price').val() || 0), "ether");

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
        $("#events").append('<li class="list-group-item">' + event.args._name + ' is for sale' + '</li>');
        App.reloadArticles();
      });
    })
    .catch(console.error);
  },

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
