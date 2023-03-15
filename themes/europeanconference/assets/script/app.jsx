import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [ticketRef, setTicketRef] = useState('');
  const [attendeeData, setAttendeeData] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`https://europa-bot.com/conf-api/attendee/${ticketRef}`);
        setAttendeeData(response.data);
      } catch (err) {
        setError(err.message);
      }
    };

    if (ticketRef) {
      fetchData();
    }
  }, [ticketRef]);

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handlePhoneNumberChange = (event) => {
    setPhoneNumber(event.target.value);
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.put(`https://europa-bot.com/conf-api/attendee/${ticketRef}`, {
        name,
        phone_number: phoneNumber,
        email,
        registered: true,
      });

      setAttendeeData(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!attendeeData) {
    return <div>Loading...</div>;
  }

  if (!attendeeData.registered) {
    return (
      <div>
        <form onSubmit={handleRegistrationSubmit}>
          <div>
            <label htmlFor="name">Name:</label>
            <input type="text" id="name" value={name} onChange={handleNameChange} />
          </div>
          <div>
            <label htmlFor="phone-number">Phone Number:</label>
            <input type="text" id="phone-number" value={phoneNumber} onChange={handlePhoneNumberChange} />
          </div>
          <div>
            <label htmlFor="email">Email:</label>
            <input type="text" id="email" value={email} onChange={handleEmailChange} />
          </div>
          <button type="submit">Register</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <p>Ticket Ref: {attendeeData.ref}</p>
      <p>Name: {attendeeData.name}</p>
      <p>Phone Number: {attendeeData.phone_number}</p>
      <p>Email: {attendeeData.email}</p>
      <p>Access Conf: {attendeeData.accessConf ? 'Yes' : 'No'}</p>
      <p>Access Gala: {attendeeData.accessGala ? 'Yes' : 'No'}</p>
    </div>
  );
}
ReactDOM.render(React.createElement(App),
    document.getElementById("app"));

export default App;