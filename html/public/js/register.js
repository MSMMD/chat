let inputs = document.getElementsByTagName('input');
if(! ([8,9,10,11].includes(error)) ){
  for(let i=0; i<inputs.length; i++){
  
    if(error% (Math.pow(2, i+1)) >= (Math.pow(2, i)) ){
        if(inputs[i].value == ""){
        inputs[i].style.background = "rgb(255, 130, 130)";
      } else {
        inputs[i].style.background = "";
      }
    }

    inputs[i].addEventListener("input", () => {
      if(error% (Math.pow(2, i+1)) >= (Math.pow(2, i)) ){
        if(inputs[i].value == ""){
          inputs[i].style.background = "rgb(255, 130, 130)";
        } else {
          inputs[i].style.background = "";
        }
      }
    });
  }
}