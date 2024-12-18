const input = document.querySelector("#city");
const button = document.querySelector("#button");
const div = document.querySelector(".result");




button.addEventListener("click", async () => {
    console.log("button clicked");
    console.log(input.value);
    fetch(`https://api.weatherapi.com/v1/current.json?key=1a2d648d4d92465cadb123919241911&q=${input.value}`)
    .then(res =>res.json())
    .then((res)=>{
        console.log(res);
        div.innerHTML = `
        <h2>${res.location.name}</h2>
        <p>${res.location.region}</p>
        <p>${res.current.condition.text}</p>
        <img src="${res.current.condition.icon}" alt="">
        <h2>${res.currentfeelslike_c}</h2>
     <div>
         <div class ="wind">
             <p>wind</p>
             <p>${res.current.wind_mph}mph</p>
         </div>
         <div class ="pressure">
             <p>Pressure</p>
             <p>${res.current.pressure_mb}mb</p> 
         </div>
     </div>
             <p>${res.location.localtime}</p> 
           `
    })

})