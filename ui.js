$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $favoritedArticles = $("#favorited-articles");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navSubmitButton = $("#nav-story-submit");
  const $navFavButton = $("#nav-user-favorites");
  const $navOwnStoriesButton = $("#nav-user-my-stories");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    debugger
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();
    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });
  
  /**
   * Event Handler for Clicking Submit
   */

  $navSubmitButton.on("click", function () {
    // Show the Submit Forms
    $submitForm.slideToggle();
  });

  /**
   * Event Handler for Clicking Favorites
   */

  $navFavButton.on("click", function () {
    // Show the Submit Forms
    hideElements();
    $favoritedArticles.show();
  });

  /**
  * Event Handler for Clicking My Stories
  */

  $navOwnStoriesButton.on("click", function () {
    // Show the Submit Forms
    hideElements();
    $ownStories.show();
  });


  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
  * Event handler for Adding New Stories
  */

  $submitForm.on("submit", async function (e) {
    e.preventDefault();
    
    const newStory = {
      author: $("#author").val(),
      title: $("#title").val(),
      url: $("#url").val()
    };

    let storyInstance = await storyList.addStory(currentUser, newStory);
    storyList.stories.unshift(storyInstance);
    let $storyElement = generateStoryHTML(storyInstance);
    $allStoriesList.prepend($storyElement);
    $allStoriesList.children().last().remove();
    $submitForm[0].reset();
    $submitForm.slideToggle();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  $allStoriesList.on("click", ".far", function(e){
    if(currentUser === null){
      return;
    }
    e.target.classList.remove("far");
    e.target.classList.add("fas");
    let favStoryId = $(e.target).parent().attr("id");
    
    addStoryToFavoritesUI(favStoryId);
    currentUser.addStoryToFavoritesAPI(favStoryId);
    
  })

  $allStoriesList.on("click", ".fas", function(e){
    e.target.classList.remove("fas");
    e.target.classList.add("far");
    let favStoryId = $(e.target).parent().attr("id");

    removeStoryFromFavoritesUI(favStoryId);
    currentUser.removeStoryFromFavoritesAPI(favStoryId);
    //remove from favorites
  })


  function addStoryToFavoritesUI(id) {
    for (let story of storyList.stories){
      if(story.storyId === id){
        currentUser.favorites.push(story);
      }
    }
    console.log(storyList.stories);
    console.log(currentUser.favorites);
  }

  function removeStoryFromFavoritesUI(id){
    for(let story of currentUser.favorites){
      if(story.storyId === id){
        currentUser.favorites.splice(currentUser.favorites.indexOf(story),1);
      }
    }
    console.log(currentUser.favorites);
  }


  


  

debugger

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let starFill = "far";
    //checks if user already defined
    if(currentUser){
      for(let favStory of currentUser.favorites){
        if(favStory.storyId === story.storyId){
          starFill = "fas";
        }
      }
    }
     
    //render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="${starFill} fa-star" ></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navUserProfile.text(currentUser.name);
    $navWelcome.show();
    $navUserProfile.show();
    $navLogOut.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});










