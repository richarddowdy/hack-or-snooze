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
  const $userProfile = $("#user-profile");

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
    $favoritedArticles.empty();

    for(let story of currentUser.favorites){
      const result = generateStoryHTML(story);
      $favoritedArticles.append(result);
    }

    $favoritedArticles.show();
  });

  /**
  * Event Handler for Clicking My Stories
  */

  $navOwnStoriesButton.on("click", function () {
    // Show the Submit Forms
    hideElements();
    $ownStories.empty();

    for (let story of currentUser.ownStories) {
      const result = generateStoryHTML(story);
      $ownStories.append(result);
    }

    $ownStories.show();
  });

  //Event handler for the User Profile button in the navbar
  $navUserProfile.on("click", function(){
    hideElements();
    
    if(currentUser){
      $("#profile-name").text(`name: ${currentUser.name}`); 
      $("#profile-username").text(`username: ${currentUser.username}`); 
      $("#profile-account-date").text(`account created: ${currentUser.createdAt.slice(0,10)}`); 
    }
    $userProfile.show();
  });

  $("#profile-edit-name").on("click", function(){
    $("#name-form").show();
    $("#profile-edit-name").hide();
  })

  $("#name-form").on("submit", async function(e){
    let newName = $("#new-name").val();

    await currentUser.updateName(newName);
    currentUser.name = newName;

    location.reload();
  })
  
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
    currentUser.ownStories.unshift(storyInstance);
    storyList.stories.unshift(storyInstance)

    let $storyElement = generateStoryHTML(storyInstance);
    $allStoriesList.prepend($storyElement);
    $ownStories.prepend($storyElement);

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

    // load and show favorited articles after login
    generateStories();

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

  /**
   * UpdateS the favorites list on the API, local user favorites array, 
   * and the DOM element.
   */

  $(".articles-container").on("click", ".fa-star", async function (e) {
    let favStoryId = $(e.target).parent().attr("id");
    if ($(e.target).hasClass("fas")){
      currentUser.favorites = await currentUser.removeStoryFromFavoritesAPI(favStoryId);
    } else {
      currentUser.favorites = await currentUser.addStoryToFavoritesAPI(favStoryId);
    }
    $(e.target).toggleClass("fas far");
    if ($(e.target).parent().parent().attr("id") === "favorited-articles"){
      $(e.target).parent().remove();
    }
  })

/**
 * Deletes an article from the API, 3 article arrays 
 * (all, favorites, and own), and from the DOM
 */

  $(".articles-container").on("click", ".fa-trash", async function (e) {
    if(currentUser) {
      let removeStoryId = $(e.target).parent().attr("id");
      let allStories = storyList.stories;
      let favStories = currentUser.favorites;
      let ownStories = currentUser.ownStories;

      await storyList.removeStory(currentUser, removeStoryId);

      allStories = allStories.filter(story => story.storyId !== removeStoryId);
      favStories = favStories.filter(story => story.storyId !== removeStoryId);
      ownStories = ownStories.filter(story => story.storyId !== removeStoryId);
      $(e.target).parent().remove();
    }   
  })

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let starFill = "far";
    let button = '';
    //checks if user already defined
    if(currentUser){
      for(let favStory of currentUser.favorites){
        if(favStory.storyId === story.storyId){
          starFill = "fas";
        }
      }
      for (let userStory of currentUser.ownStories){
        if (userStory.storyId === story.storyId){
          button = '<i class="fas fa-trash"></i>'
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
      ${button}
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
      $userProfile,
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoritedArticles
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










