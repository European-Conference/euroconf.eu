
//This code is largely taken from the W3 Schools Countdown Timer example

// Set the date we're counting down to. This date uses a 24-hour clock and is in EST. 
var countDownDate = new Date("Feb 2, 2024 11:59:59").getTime();

// Update the count down every 1 second
var x = setInterval(function() {

  // Get today's date and time
  var now = new Date().getTime();
    
  // Find the distance between now and the count down date
  var distance = countDownDate - now;
    
  // Time calculations for days, hours, minutes and seconds
  var days = Math.floor(distance / (1000 * 60 * 60 * 24));
  var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((distance % (1000 * 60)) / 1000);

  var daysString = days.toString();
  var hoursString = hours.toString();
  var minutesString = minutes.toString();
  var secondsString = seconds.toString();

  // Output the result in an element with id="countdown"
  document.getElementById("countdown").innerHTML = daysString.padStart(2, "0") + ":" + hoursString.padStart(2, "0") + ":" + minutesString.padStart(2, "0") + ":" + secondsString.padStart(2, "0");
    
  // If the count down is over, write some text 
  if (distance < 0) {
    clearInterval(x);
    document.getElementById("increase").innerHTML = ""
    document.getElementById("countdown").innerHTML = "Last-minute tickets still available!";
  }
}, 1000);
