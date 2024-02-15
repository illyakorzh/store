function promiseReducer(state = {}, { promiseName, type, status, payload, error }) {
  if (type === 'PROMISE') {
    return {
      ...state, [promiseName]: { status, payload, error }
    };
  }
  return state;
}

const actionPending = (promiseName) => ({ type: 'PROMISE', promiseName, status: 'PENDING' });
const actionFulfilled = (promiseName, payload) => ({ type: 'PROMISE', promiseName, status: 'FULFILLED', payload });
const actionRejected = (promiseName, error) => ({ type: 'PROMISE', promiseName, status: 'REJECTED', error });
const actionPromise = (promiseName, promise) => async dispatch => {
  dispatch(actionPending(promiseName)); //сигналізуємо redux, що проміс почався
  try {
    const payload = await promise; //очікуємо промісу
    dispatch(actionFulfilled(promiseName, payload)); //сигналізуємо redux, що проміс успішно виконано
    return payload; //у місці запуску store.dispatch з цим thunk можна також отримати результат промісу
  } catch (error) {
    dispatch(actionRejected(promiseName, error)); //у разі помилки - сигналізуємо redux, що проміс не склався
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const jwtDecode = (token) => {
  try {
    let split = token.split('.', 2);
    return JSON.parse(atob(split[1]));
  } catch (e) {
    alert('Ты не зарегистрирован ');
  }
};

function authReducer(state = {}, { type, token }) {
  if (token) {
    localStorage.authToken = token;
  }
  if (type === 'AUTH_LOGIN') {
    let payload = jwtDecode(token);
    return {
      token, payload,
    };
  }
  if (type === 'AUTH_LOGOUT') {
    return {};
  }
  return state;
}

const actionAuthLogin = token => ({ type: 'AUTH_LOGIN', token });
const actionAuthLogout = () => ({ type: 'AUTH_LOGOUT' });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function cartReducer(state = {}, action) {
  console.log(state);

  if (action.type === 'CART_ADD') {
    const updatedState = { ...state };
    const { _id } = action.good;


    if (updatedState[_id]) {
      updatedState[_id].count += action.count;
    } else {
      updatedState[_id] = {
        count: action.count, good: action.good,
      };
    }
    return updatedState;
  }

  if (action.type === 'CART_SUB') {

    const updatedState = { ...state };
    const { _id } = action.good;

    if (updatedState[_id]) {
      updatedState[_id].count -= action.count;
    }
    if (updatedState[_id].count < 1) {
      updatedState[_id].count = 0;
    }

    return updatedState;
  }

  if (action.type === 'CART_SET') {
    const updatedState = { ...state };
    const { _id } = action.good;
    if (action.count < 1) {
      delete updatedState[_id];
    }
    if (action.count > 0) {
      updatedState[_id] = { count: action.count, good: action.good };
    }
    return updatedState;
  }

  if (action.type === 'CART_DEL') {
    const updatedState = { ...state };
    const { _id } = action.good;
    delete updatedState[_id];
    return updatedState;
  }

  if (action.type === 'CART_CLEAR') {
    return {};
  }
  return state;
}
const actionCartAdd = (good, count = 1) => ({ type: 'CART_ADD', count, good });
const actionCartSub = (good, count = 1) => ({ type: 'CART_SUB', count, good });
const actionCartDel = (good) => ({ type: 'CART_DEL', good });
const actionCartSet = (good, count = 1) => ({ type: 'CART_SET', count, good });
const actionCartClear = () => ({ type: 'CART_CLEAR' });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function localStoredReducer(originalReducer, localStorageKey) {
  let flag = true;

  function wrapper(state, action) {
    if (flag) {
      flag = false;
      const token = localStorage.getItem(localStorageKey);
      try {
        if (token !== "{}" && token !== null) {
          return JSON.parse(token);
        }
      } catch (e) {
        console.log(e);
      }
    }
    const newState = originalReducer(state, action);
    localStorage.setItem(localStorageKey, JSON.stringify(newState));
    return newState;
  }
  return wrapper;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const reducers = {
  promise: localStoredReducer(promiseReducer, 'promise'),
  cart: cartReducer,
  auth: localStoredReducer(authReducer, 'auth')
};

function createStore(reducer) {
  let state = reducer(undefined, {}); //стартова ініціалізація стану, запуск редьюсера зі state === undefined
  let cbs = [];                     //масив передплатників

  const getState = () => state;            //функція, що повертає змінну із замикання
  const subscribe = cb => (cbs.push(cb),   //запам'ятовуємо передплатників у масиві
    () => cbs = cbs.filter(c => c !== cb)); //повертаємо функцію unsubscribe, яка видаляє передплатника зі списку

  const dispatch = action => {
    if (typeof action === 'function') { //якщо action – не об'єкт, а функція
      return action(dispatch, getState); //запускаємо цю функцію і даємо їй dispatch і getState для роботи
    }
    const newState = reducer(state, action); //пробуємо запустити редьюсер
    if (newState !== state) { //перевіряємо, чи зміг ред'юсер обробити action
      state = newState; //якщо зміг, то оновлюємо state
      for (let cb of cbs) cb(); //та запускаємо передплатників
    }
  };

  return {
    getState, //додавання функції getState в результуючий об'єкт
    dispatch, subscribe //додавання subscribe в об'єкт
  };
}

function combineReducers(reducers) {
  function totalReducer(totalState = {}, action) {
    const newTotalState = {}; //об'єкт, який зберігатиме лише нові стани дочірніх редьюсерів

    //цикл + квадратні дужки дозволяють написати код, який працюватиме з будь-якою кількістю дочірніх ред'юсерів
    for (const [reducerName, childReducer] of Object.entries(reducers)) {
      const newState = childReducer(totalState[reducerName], action); //запуск дочірнього ред'юсера
      if (newState !== totalState[reducerName]) { //якщо він відреагував на action
        newTotalState[reducerName] = newState; //додаємо його в NewTotalState
      }
    }

    //Універсальна перевірка на те, що хоча б один дочірній редьюсер створив новий стейт:
    if (Object.values(newTotalState).length) {
      return { ...totalState, ...newTotalState }; //створюємо новий загальний стейт, накладаючи новий стейти дочірніх редьюсерів на старі
    }

    return totalState; //якщо екшен був зрозумілий жодним із дочірніх редьюсерів, повертаємо загальний стейт як був.
  }

  return totalReducer;
}

const store = createStore(combineReducers(reducers));


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const url = "http://shop-roles.node.ed.asmer.org.ua/graphql";
const basket = document.querySelector(`.basket`);
const gql = async (endPoint, query, variables) => {
  const data = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
  };
  if (localStorage.authToken) {
    data.headers.Authorization = "Bearer " + localStorage.authToken;
  }

  const response = await fetch(endPoint, data);
  const responseData = await response.json();
  return responseData;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const categoryFind = async () => {
  const getCategoryFind = `query ($query: String) {
    CategoryFind(query: $query) {
      _id
      name
    }
  }`;

  return gql(url, getCategoryFind, { "query": "[{\"parent\": null}]" });
};
const categoryFindOne = async (id) => {
  const getCategoryFindOne = `query ($query: String) {
    CategoryFindOne(query: $query) {
      _id
      name
      subCategories { _id, name }
      goods { _id, name, price, images { url } }
    }
  }`;

  return gql(url, getCategoryFindOne, { "query": `[{ "_id": "${id}" }]` });
};
const goodFindOne = async (id) => {
  const getGoodFindOne = `query ($query: String) {
    GoodFindOne(query: $query) {
      _id
      name
      price
      description
      images { url }
    }
  }`;

  return gql(url, getGoodFindOne, { "query": `[{ "_id": "${id}" }]` });
};
const getLogin = async (login, password) => {

  const log = `query ($login: String, $password: String) {
  login(login:$login,password:$password)
  }`;

  const token = await gql(url, log, { "login": `${login}`, "password": `${password}` });

  store.dispatch(actionAuthLogin(token.data.login));
};
const setRegistration = async (login, password) => {
  const registration = ` mutation ($login:String, $password: String){
  UserUpsert(user: {login:$login, password: $password}){
    login
    createdAt
    _id
    }
  }`;

  const response = await gql(url, registration, { "login": `${login}`, "password": `${password}` });
  const user = response.data.UserUpsert;

  if (user && user._id) {
    store.dispatch(actionPromise('getLogin', getLogin(login, password)));

  } else {
    alert(`Ты уже зарегистрирован`);
  }

};
const getOrderUpsert = (goods) => {
  const OrderUpsert = `mutation ($goods: [OrderGoodInput]) {
  OrderUpsert(order: { orderGoods: $goods }) {
    _id
    createdAt
    total
      orderGoods{
        _id
        count
        price
        goodName
        total
      }
  }
}
`;
  return gql(url, OrderUpsert, { "goods": goods });
};
const getOrderFind = async () => {
  const OrderFind = `query($query: String) {
    OrderFind(query :$query ) {
      _id
      createdAt
      total
      orderGoods{
        _id
        count
        price
        goodName
        total
      }
      }
    }`;
  return gql(url, OrderFind, { "query": "[{}]" });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////
const displayCategory = (CategoryFind) => {

  const aside = document.querySelector('.left-aside');
  const div = document.createElement('div');
  div.classList.add('div-category');
  aside.innerHTML = '';

  CategoryFind.forEach((category) => {
    const { _id, name } = category;
    const correctName = name.charAt(0).toUpperCase() + name.slice(1);

    let a = document.createElement('a');
    a.setAttribute(`href`, `#/category/${_id}`);
    a.style.cursor = 'pointer';
    a.classList.add('a-category');
    a.innerText = correctName;
    div.appendChild(a);
    aside.appendChild(div);
  });
};
const displayGoods = (goods) => {
  const wrapperCart = document.querySelector('.wrapper-cart');
  wrapperCart.innerHTML = '';

  try {
    goods.forEach((elem) => {

      const id = elem._id;
      const cart = document.createElement('div');
      cart.classList.add('cart');

      const imgCart = document.createElement('img');
      imgCart.classList.add('imgCart');
      imgCart.src = "http://shop-roles.node.ed.asmer.org.ua/" + elem.images[0].url;

      const elementName = document.createElement(`h2`);
      elementName.classList.add(`elementName`);
      elementName.innerText = elem.name;

      const price = document.createElement(`span`);
      price.classList.add(`price`);
      price.innerText = elem.price + ` ГРН`;

      const aCart = document.createElement(`a`);
      aCart.classList.add(`aCart`);
      aCart.innerText = ` Подробнее`;
      aCart.setAttribute(`href`, `#/good/${id}`);
      aCart.style.cursor = 'pointer';

      cart.prepend(aCart);
      cart.prepend(price);
      cart.prepend(elementName);
      cart.prepend(imgCart);
      wrapperCart.prepend(cart);
    });
  } catch (e) {
    alert(`Здесь рыбы нет!!! `);
  }
};
const displayGood = (good) => {

  const wrapperCart = document.querySelector('.wrapper-cart');
  wrapperCart.style.cssText = `
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  `;
  wrapperCart.innerHTML = '';

  const id = good._id;

  const imgGood = document.createElement('img');
  imgGood.classList.add('imgGood');
  imgGood.src = "http://shop-roles.node.ed.asmer.org.ua/" + good.images[0].url;

  const goodName = document.createElement(`h2`);
  goodName.classList.add(`elementName`);
  goodName.innerText = good.name;

  const goodPrice = document.createElement(`span`);
  goodPrice.classList.add(`goodPrice`);
  goodPrice.innerText = good.price + ` ГРН`;

  const goodDescription = document.createElement(`span`);
  goodDescription.classList.add(`goodDescription`);
  goodDescription.innerText = good.description;

  const addGoodToBasket = document.createElement(`button`);
  addGoodToBasket.classList.add(`addGoodToBasket`);
  addGoodToBasket.innerText = `Добавить в корзину`;
  addGoodToBasket.setAttribute(`href`, `#/addGoodToBasket/${id}`);

  addGoodToBasket.style.cursor = 'pointer';

  addGoodToBasket.addEventListener('click', () => store.dispatch(actionCartAdd(good, 1)));

  wrapperCart.prepend(imgGood);
  wrapperCart.append(goodName);
  wrapperCart.append(goodPrice);
  wrapperCart.append(goodDescription);
  wrapperCart.append(addGoodToBasket);

};
const displayBasket = () => {
  const wrapperCart = document.querySelector('.wrapper-cart');
  wrapperCart.innerHTML = '';
  const state = store.getState();
  const elem = state.cart;

  for (const elemKey in elem) {
    //console.log(elem[elemKey].good);

    const containerForBasketGood = document.createElement(`div`);
    containerForBasketGood.setAttribute(`class`, `containerForBasketGood`);

    const imgBasket = document.createElement('img');
    imgBasket.classList.add('imgBasket');
    imgBasket.src = "http://shop-roles.node.ed.asmer.org.ua/" + elem[elemKey].good.images[0].url;

    const plus = document.createElement(`span`);
    plus.innerText = `+`;
    plus.classList.add('plus');
    plus.style.cursor = 'pointer';
    plus.addEventListener('click', () => store.dispatch(actionCartAdd(elem[elemKey].good, 1)));

    const minus = document.createElement(`span`);
    minus.innerText = `_`;
    minus.classList.add('minus');
    minus.addEventListener('click', () => store.dispatch(actionCartSub(elem[elemKey].good, 1)));

    const count = document.createElement(`span`);
    count.innerText = `${elem[elemKey].count}`;
    count.classList.add('count');

    const setCount = document.createElement(`input`);
    setCount.classList.add('setCount');
    setCount.setAttribute(`type`, `number`);
    setCount.setAttribute(`placeholder`, `input value`);
    setCount.addEventListener(`change`, () => store.dispatch(actionCartSet(elem[elemKey].good, setCount.value)));

    const imgTrash = document.createElement('img');
    imgTrash.classList.add('imgTrash');
    imgTrash.src = "img/корзина (2).png";
    imgTrash.addEventListener('click', () => store.dispatch(actionCartDel(elem[elemKey].good)));

    wrapperCart.prepend(containerForBasketGood);

    containerForBasketGood.prepend(imgTrash);
    containerForBasketGood.prepend(setCount);
    containerForBasketGood.prepend(count);
    containerForBasketGood.prepend(minus);
    containerForBasketGood.prepend(imgBasket);
    containerForBasketGood.prepend(plus);

  }

  if (wrapperCart.childElementCount) {

    const buttonDeleteAllGoodsInBasket = document.createElement(`button`);
    buttonDeleteAllGoodsInBasket.classList.add('buttonDeleteAllGoodsInBasket');
    buttonDeleteAllGoodsInBasket.innerText = `Delete all goods`;
    wrapperCart.append(buttonDeleteAllGoodsInBasket);
    buttonDeleteAllGoodsInBasket.addEventListener('click', () => store.dispatch(actionCartClear()));

    const payForGoods = document.createElement(`button`);
    payForGoods.classList.add('payForGoods');
    payForGoods.innerText = `Pay for goods`;
    wrapperCart.append(payForGoods);

    payForGoods.addEventListener('click', () => {
      const goods = [];
      for (let good in store.getState().cart) {
        const count = store.getState().cart[good].count;
        const id = store.getState().cart[good].good._id;
        goods.push({'count': count, 'good': { '_id': id } });
      }
      store.dispatch(actionPromise('getOrderUpsert', getOrderUpsert(goods)));
      store.dispatch(actionCartClear());
    });
  }

};
const displayRegistration = () => {
  const wrapperCart = document.querySelector('.wrapper-cart');
  wrapperCart.innerHTML = '';

  const registerInputLogin = document.createElement(`input`);
  registerInputLogin.setAttribute(`class`, `registerInputLogin`);
  registerInputLogin.setAttribute(`placeholder`, `Input login for registration`);

  const registerInputPassword = document.createElement(`input`);
  registerInputPassword.setAttribute(`class`, `registerInputPassword`);
  registerInputPassword.setAttribute(`placeholder`, `Input password for registration`);

  const registerButton = document.createElement(`button`);
  registerButton.setAttribute(`class`, `registerButton`);
  registerButton.innerText = `Register`;

  registerButton.addEventListener(`click`, () => {
    store.dispatch(actionPromise('setRegistration', setRegistration(registerInputLogin.value, registerInputPassword.value)));
    registerInputLogin.value = '';
    registerInputPassword.value = '';
  });
  wrapperCart.prepend(registerInputLogin);
  wrapperCart.append(registerInputPassword);
  wrapperCart.append(registerButton);

};
const displayEnter = () => {
  const wrapperCart = document.querySelector('.wrapper-cart');
  wrapperCart.innerHTML = '';

  const enterInputLogin = document.createElement(`input`);
  enterInputLogin.setAttribute(`class`, `enterInputLogin`);
  enterInputLogin.setAttribute(`placeholder`, `Input login for enter`);

  const enterInputPassword = document.createElement(`input`);
  enterInputPassword.setAttribute(`class`, `enterInputPassword`);
  enterInputPassword.setAttribute(`placeholder`, `Input password for enter`);

  const enterButton = document.createElement(`button`);
  enterButton.setAttribute(`class`, `enterButton`);
  enterButton.innerText = `enter`;

  enterButton.addEventListener(`click`, () => {
    store.dispatch(actionPromise('getLogin', getLogin(enterInputLogin.value, enterInputPassword.value)));
    enterInputLogin.value = '';
    enterInputPassword.value = '';
  });
  wrapperCart.prepend(enterInputLogin);
  wrapperCart.append(enterInputPassword);
  wrapperCart.append(enterButton);

};
const displayExit = () => {


  const aForRegister = document.querySelector('.aForRegister');
  const aForLogin = document.querySelector('.aForLogin');


  aForRegister.style.display = 'none';
  aForLogin.style.display = 'none';

  const wrapperCart = document.querySelector('.wrapper-cart');
  wrapperCart.innerHTML = '';


  const completedOrders = document.createElement(`a`);
  completedOrders.setAttribute(`href`, `#/history/`);
  completedOrders.style.cursor = 'pointer';
  completedOrders.classList.add('completedOrders');
  completedOrders.innerText = 'completed orders';

  const buttonExit = document.createElement(`button`);
  buttonExit.setAttribute(`class`, `buttonExit`);
  buttonExit.setAttribute(`id`, `buttonExit`);
  buttonExit.innerText = `Log out`;

  const login = document.createElement(`span`)
  login.setAttribute(`class`, `buttonExit`);
  login.innerText=  `Hi  ${store.getState().auth.payload.sub.login} !!!`

  const wrapperButtonHeader = document.querySelector('.wrapperButtonHeader');
  wrapperButtonHeader.prepend(completedOrders);
  wrapperButtonHeader.prepend(buttonExit);
  wrapperButtonHeader.prepend(login);

  buttonExit.addEventListener(`click`, () => {
    completedOrders.style.display = 'none';
    buttonExit.style.display = 'none';
    login.style.display = 'none';
    aForRegister.style.display = 'inline';
    aForLogin.style.display = 'inline';
    store.dispatch(actionAuthLogout());
  });

};
const displayHistory = () => {

  const wrapperCart = document.querySelector('.wrapper-cart');
  wrapperCart.style.cssText = ``
  const state = store.getState();

  const orderFind = state.promise?.getOrderFind?.payload?.data?.OrderFind



  if( state.promise?.getOrderFind?.status==='FULFILLED'){
    try {
      orderFind.forEach((elem) => {


        const date = new Date(+elem.createdAt).toString().split(` `).slice(1, 5).join();
        const cart = document.createElement('div');
        cart.classList.add('orderListCart');

        const id = document.createElement(`span`);
        id.classList.add(`orderListText`);
        id.innerText = `id ` + elem._id;

        const createdAt = document.createElement(`span`);
        createdAt.classList.add(`orderListText`);
        createdAt.innerText = `Created at ` + date;

        const total = document.createElement(`span`);
        total.classList.add(`orderListText`);
        total.innerText = `Total ` + elem.total;



        const goods = elem.orderGoods
        goods.forEach((good)=>{

          const listForGood = document.createElement('div');
          listForGood.classList.add('listForGood');

          const id = document.createElement(`span`);
          id.classList.add(`orderListText`);
          id.innerText = `id - ` + good._id;

          const count = document.createElement(`span`);
          count.classList.add(`orderListText`);
          count.innerText = `Quantity - ` + good.count;

          const price = document.createElement(`span`);
          price.classList.add(`orderListText`);
          price.innerText = `Price - ` + good.price;

          const goodName = document.createElement(`span`);
          goodName.classList.add(`orderListText`);
          goodName.innerText = `Name - ` + good.goodName;

          const total = document.createElement(`span`);
          total.classList.add(`orderListText`);
          total.innerText = `Total - ` + good.total;



          listForGood.prepend(id);

          listForGood.prepend(total);
          listForGood.prepend(price);
          listForGood.prepend(count);

          listForGood.prepend(goodName);

          cart.prepend(listForGood);
        })


        cart.prepend(createdAt);
        cart.prepend(total);
        cart.prepend(id);

        wrapperCart.prepend(cart);
      });
    } catch (e) {
      alert(e);
    }}
};
////////////////////////////////////////////////////////////////////////////////////////////////////////
store.dispatch(actionPromise('categoryFind', categoryFind()));
window.addEventListener('hashchange', () => {
  const newHash = window.location.hash;
  const id = newHash.split(`/`)[2];

  if (newHash.includes('category')) {
    store.dispatch(actionPromise('categoryFindOne', categoryFindOne(id)));
  }
  if (newHash.includes('good')) {
    console.log(id);
    store.dispatch(actionPromise('goodFindOne', goodFindOne(id)));
  }
  if (newHash.includes('basket')) {
    displayBasket();
  }
  if (newHash.includes('register')) {
    displayRegistration();
  }
  if (newHash.includes('login')) {
    displayEnter();
  }
  if (newHash.includes('history')) {
    store.dispatch(actionPromise('getOrderFind', getOrderFind()));
  }

});

let previousAuthStatus = false;
let previousToken = '';
store.subscribe(() => {

  const state = store.getState();
  //console.log(state);
  const newHash = window.location.hash;
  // console.log(newHash);
  const category = state.promise.categoryFind?.payload;

  if (category) {
    displayCategory(category.data.CategoryFind);
  }

  const goods = state.promise.categoryFindOne?.payload;

  if (goods && newHash.includes('category')) {
    displayGoods(goods.data.CategoryFindOne.goods);
  }

  const good = state.promise.goodFindOne?.payload;
  if (good && newHash.includes('good')) {
    displayGood(good.data.GoodFindOne);
  }
  if (newHash.includes('basket')) {
    displayBasket();
  }
  if (newHash.includes('register')) {
    displayRegistration();
  }
  if (newHash.includes('login')) {
    displayEnter();
  }

  const authStatus = state.promise.getLogin?.status === 'FULFILLED';
  const token = state.auth?.token;
  if (authStatus && token && (authStatus !== previousAuthStatus || token !== previousToken)) {
    displayExit();
  }
  previousAuthStatus = authStatus;
  previousToken = token;

  if (newHash.includes('history')) {
    displayHistory();
  }
});

