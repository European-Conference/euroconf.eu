const useState = React.useState;
const useEffect = React.useEffect;
const componentDidMount = React.Component.componentDidMount;
const useLocation = ReactRouter.useLocation;

function useQuery() {
  return new URLSearchParams(window.location.search);
}

function getUnixTime() {
  return Math.floor(Date.now() / 1000);
}

function TicketAppRefPicker(props) {
  const [ref, setRef] = useState('');
  const query = useQuery();

  useEffect(() => {
    let queryRef = query.get('ref');
    if (queryRef) {
      props.onRefPicked(queryRef);
    }
  });
  

  const handleSubmit = (event) => {
    console.log("submitting ticket ref " + ref);
    event.preventDefault();
    props.onRefPicked(ref);
    window.history.pushState(null, null, `?ref=${ref}`);
  };

  return (
    <div className="ref-picker">
      <form onSubmit={handleSubmit} className="pure-form">
        <div>
          <label htmlFor="ref">Ticket Reference:</label>
          <input type="text" id="ref" value={ref} onChange={(e) => setRef(e.target.value)}/>
        </div>
        <button className="pure-button pure-button-primary" type="submit">Submit</button>
      </form>
    </div>
  );
}

let shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function TicketApp(props) {
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);
  const [attendee, setAttendee] = useState({});
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [panelSelected, setPanelSelected] = useState([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferName, setTransferName] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [message, setMessage] = useState('');
  var schedule;

  setAttendeeData = (data) => {
    setAttendee({...attendee, ...data});
  };

  let parseScriptData = () => {
    let speakers = {};
    JSON.parse(SPEAKER_PAGES).forEach((speaker) => {
      let permalink = speaker.RelPermalink;
      let speakerId = permalink.split('/')[2];
      speakers[speakerId] = {name: speaker.Params.name, link: permalink};
    });

    schedule = JSON.parse(SCHEDULE);
    let slots = schedule.map((day) => day.slots.map((slot) => slot.events.filter((event) => event.type === 'panel'))).flat().filter((slot) => slot.length > 0);
    let panels = slots.flat();

    setScheduleSlots(slots);
    setSpeakers(speakers);
    setPanelSelected(new Array(panels.length).fill(false));
  };

  useEffect(() => {
    console.log("ticket ref set to " + props.ticketRef);
    if (!props.ticketRef) {
      setIsFetching(false);
      return;
    }
    console.log("fetching");

    const fetchData = async (ref) => {
      try {
        const response = await axios.get(`https://europa-bot.com/conf-api/attendee/${ref}`);
        response.data.affiliation = "European Conference Attendee";
        setAttendeeData(response.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setError('The ticket reference does not exist.');
        } else {
          console.log(err.response);
          setError(err.message);
        }
      }
      setIsFetching(false);
    };

    fetchData(props.ticketRef);
    parseScriptData();
  }, [props.ticketRef]);

  const getPreferences = () => {
    let panelsSelected = [];
    let panel_counter = 0;
    for (let i = 0; i < scheduleSlots.length; i++) {
      for (let j = 0; j < scheduleSlots[i].length; j++, panel_counter++) {
        if (panelSelected[panel_counter]) {
          panelsSelected.push(scheduleSlots[i][j].content);
        }
      }
    }

    return {
      time: getUnixTime(),
      panelsSelected
    };
  }

  const getQRCode = () => {
    return kjua({text: `https://euroconf.eu/ticket?ref=${props.ticketRef}`, size: 200, fill: '#000', back: '#fff'});
  }

  const handleTryAgain = () => {
    setError(null);
    setIsFetching(true);
    setAttendee({});
    setPanelSelected([]);
    setTransferOpen(false);
    setTransferName('');
    setTransferEmail('');
    setMessage('');
    props.clearRef();
    setTicketRef(null);
  }
  
  let success = (message) => {
    setMessage(message + " Reloading in 10 seconds...");
    setTimeout(() => location.reload(), 10000);
  }

  let transferTicket = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`https://europa-bot.com/conf-api/attendee/${props.ticketRef}`, {
        name: transferName,
        email: transferEmail,
        transfer: true
      });

      success("Ticket transfered successfully. Send this link to the new attendee: https://euroconf.eu/ticket?ref=" + props.ticketRef + ".");
    } catch (err) {
      setError(err.message + " " + err.response.data.error);
    }

  }

  const handleRegister = async (event) => {
    event.preventDefault();
    let preferences = getPreferences();

    try {
      const response = await axios.put(`https://europa-bot.com/conf-api/attendee/${props.ticketRef}`, {
        name: attendee.name,
        phone_number: attendee.phoneNumber,
        email: attendee.email,
        affiliation: attendee.affiliation,
        registered: true,
        preferences
      });

      setAttendeeData(response.data);
      success("Thank you for registering.");
    } catch (err) {
      setError(err.message);
    }
  };

  if (isFetching) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className='error'>
      Error: {error}
      <button onClick={handleTryAgain}>Try again</button>
      </div>;
  }

  if (message) {
    return <div className='message'>{message}</div>;
  }

  if (!attendee.registered) {
    let speakerLink = (speakerId, ind) => {
      if (speakerId in speakers) {
        return <span key={`speaker-${ind}`} className="speaker">{ind > 0 && ", "} <a target="_blank" href={speakers[speakerId].link}>{speakers[speakerId].name}</a></span>;
      } else {
        return <span key={`speaker-${ind}`} className="speaker"></span>
      }
    }
    let speakerListForPanel = (panel) => {
      return panel.speakers.map((speakerId, ind) => {
        return speakerLink(speakerId, ind);
      });
    }

    let handlePanelSelected = (e, panel_id) => {
      let selected = panelSelected.slice();
      let panel_counter = 0;
      for (let i = 0; i < scheduleSlots.length; i++) {
        let slot = scheduleSlots[i];
        let this_slot = false;
        for (let j = 0; j < slot.length; j++, panel_counter++) {
          if (panel_counter === panel_id) {
            this_slot = true;
          }
        }
        if (this_slot) {
          panel_counter -= slot.length;
          for (let j = 0; j < slot.length; j++, panel_counter++) {
            if (panel_counter !== panel_id) {
              selected[panel_counter] = false;
            } else {
              selected[panel_counter] = e.target.checked;
            }
          }
      }
    }
    setPanelSelected(selected);
  }

    let panelCheckboxes = () => {
      let panel_id = 0;
      return scheduleSlots.map((slot) => {
        return slot.map((panel, ind) => {
          let pid = panel_id++;
          return <div key={pid}>
            {ind === 0 ? <div className="panel-separator">Select <em>one</em> of the below:</div> : ""}
            <div  className={`panel-checkbox ${panelSelected[pid] ? "selected" : "not-selected"}`}>
            <div className="checkbox">
            <input type="checkbox" id={`panel-${pid}`} checked={panelSelected[pid]} onChange={(e) => handlePanelSelected(e, pid)}/>
            </div>
            <label htmlFor={`panel-${pid}`}>{panel.content} <span className="speakers">{speakerListForPanel(panel)}</span></label>
          </div></div>;
        });
    });

        /*
        return <div key={ind} className={`panel-checkbox ${panelSelected[ind] ? "selected" : "not-selected"}`}>
          <div className="checkbox">
          <input type="checkbox" id={`panel-${ind}`} onChange={(e) => setPanelSelected(panelSelected.map((x, i) => i === ind ? e.target.checked : x))}/>
          </div>
          <label htmlFor={`panel-${ind}`}>{panel.content} <span className="speakers">{speakerListForPanel(panel)}</span></label>
        </div>
      });
      */
    }

    let handleOpenTransfer = (e) => {
      e.preventDefault();
      setTransferOpen(true);
    }

    let handleCloseTransfer = (e) => {
      e.preventDefault();
      setTransferOpen(false);
    }

    let ticketChange = () => {
        if (!attendee.transferable) {
          return <span className='legendSub'>This ticket type is not transferable. If you would like to change the email address or name associated with this ticket, please contact <a href='mailto:tickets@euroconf.eu'>tickets@euroconf.eu</a>. The name above must match a form of photo identification that you will bring to the registration desk of the conference.</span>
        } else {
          if (transferOpen) {
            return <form className="pure-form transfer-form" onSubmit={transferTicket}>
              <legend>
                <span className='legendMain'>What is the name of the person you want to transfer this ticket to?</span>
                <span className='legendSub'>They will have to show photo identification that matches the name you enter.</span>
              </legend>
              <input type="text" name="name" placeholder="Name" value={transferName} onChange={(e) => setTransferName(e.target.value)} required/>

              <legend>
                <span className='legendMain'>What is the email address of the person you want to transfer this ticket to?</span>
                <span className='legendSub'>They will receive a confirmation email.</span>
              </legend>
              <input type="email" name="email" placeholder="Email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} required/>

              <div className='buttons'>
                <button type="submit" className="pure-button pure-button-primary">Transfer ticket</button> or <a onClick={handleCloseTransfer}>cancel</a>
                <br/><span className='legendSub'>You can only transfer each ticket once.</span>
              </div>
            </form>
          } else {
            return <span className='legendSub'>If you want, you can <a onClick={handleOpenTransfer}>transfer your ticket to someone else</a>.</span>
          }
        }
    }
    let registrationHeader = () => {
      return <div className='ticket-transfer'>
        <p className="ticketInfo">{attendee.accessGala ? "Conference and Reception" : "Conference-only"} ticket to be issued to <span className="cant-change">{attendee.name}</span> at <span className="email cant-change">{attendee.email}</span></p>
        {ticketChange()}
      </div>
    }

    let registrationForm = () => {
      if (transferOpen) return <div></div>;
      return <form className="pure-form" onSubmit={handleRegister}>
          <legend>
            <span className='legendMain'>What's a phone number we can reach you at?</span>
            <span className='legendSub'>Please provide a number where you can receive texts during the days of the event, and include the country code for non-US numbers. We will use this number for last minute schedule changes and emergencies.</span>
          </legend>
          <div>
            <label htmlFor="phone-number">Phone Number:</label>
            <input type="tel" id="phone-number" value={attendee.phone_number} onChange={(e) => setAttendeeData({phone_number: e.target.value})} required/>
          </div>

          <legend>
            <span className='legendMain'>Are you affiliated with Harvard?</span><br/>
            <span className='legendSub'>If you are not a current holder of a Harvard ID, please pick "Not affiliated with Harvard".</span>
          </legend>
          <div>
            <label htmlFor="affiliation">Harvard Affiliation:</label>
            <select name="affiliation" id="affiliation" value={attendee.affiliation} onChange={(e) => setAttendeeData({affiliation: e.target.value})} required>
                <option value="Undergraduate Student: Harvard College">Undergraduate Student: Harvard College</option>
                <option value="Graduate Student: Harvard Kennedy School">Graduate Student: Harvard Kennedy School</option>
                <option value="Harvard Graduate Student: Non-HKS">Harvard Graduate Student: Non-HKS</option>
                <option value="Harvard Faculty, Staff, or Fellow">Harvard Faculty, Staff, or Fellow</option>
                <option value="European Conference Attendee">Not affiliated with Harvard</option>
                <option value="Media">Media</option>
            </select>
          </div>


          <legend>
            <span className='legendMain'>Please select the panels that interest you from the list below.</span>
            <span className='legendSub'>We will only use your choices to estimate attendance and improve room allocation, and you are welcome to attend any sessions you like during the conference.</span>
          </legend>
          <div className="panels">
            {panelCheckboxes()}
          </div>
          <button className="pure-button pure-button-primary" type="submit">Register for the European Conference</button>
          <br/>
          <span className='legendSub'>{attendee.transferable ? "You will not be able to transfer your ticket after registering" : ""}</span>
    </form>
    }

    return (
      <div className="completeRegistration">
        <h2>{transferOpen ? 'Transfer your ticket' : 'Complete your registration'}</h2>
        {registrationHeader()}
        {registrationForm()}
      </div>
    );
  }

  return <div>
  <h2>Your ticket to the European Conference 2023</h2>
  <div className={`ticket ${attendee.accessGala ? 'conf-gala' : 'conf-only'}`}>
    <img className="ticket-qr" src={getQRCode().src} alt="QR Code"/>
    <div className="ticket-info">
      <div className="field">
        <span className="field-value ticket-ref">{props.ticketRef}</span>
        <span className="explainer">Ticket reference code</span>
      </div>
      <div className="field">
        <span className="field-value name">{attendee.name}</span>
        <span className="explainer">Name</span>
      </div>

      <div className="field">
        <span className={`field-value access ${attendee.accessGala ? 'conf-gala' : 'conf-only'}`}>{attendee.accessGala ? "Conference and Reception" : "Conference only"}</span>
        <span className="explainer">Access</span>
      </div>

    </div>
  </div>
  <p className="subtext">Please present the above to the registration desk at the conference to receive your badge. For the locations of the registration desks, see <a href='/info'>the info page</a>. You will need to show a photo ID that matches the name above. Please do not print your ticket.</p>
  <p className="subtext">For any questions, don't hesitate to contact us at <a href='mailto:contact@euroconf.eu'>contact@euroconf.eu</a>. We look forward to welcoming you to the conference.</p>
  </div>
}


function TicketAppWrapper(props) {
  const [ticketRef, setTicketRef] = useState(null);

  let handleRefPicked = (ref) => {
    console.log(`handle ref picked handler ${ticketRef}`);
    setTicketRef(ref);
    history.pushState({}, null, `?ref=${ref}`);
  }

  let handleClearRef = () => {
    console.log("clear ref");
    setTicketRef(null);
    history.pushState({}, null, window.location.pathname);
  }

  console.log("rendering with ticket ref " + ticketRef);

  if (!ticketRef) {
    return <TicketAppRefPicker onRefPicked={handleRefPicked}/>
  }

  return <TicketApp ticketRef={ticketRef} clearRef={handleClearRef}/>
}

window.onload = () => {
  ReactDOM.render(React.createElement(TicketAppWrapper), document.getElementById("app"));
};
