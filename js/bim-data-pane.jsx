'use strict';

class BimDataPane extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      show: false,
      title: "BIM Element Name",
      family: "Furniture",
      type: "Table",
      count: 12,
    };
    // Assign ourselves as the instance singleton.
    window._BimDataPaneInstance = this;
  }

  display(enabled)
  {
    this.setState({ ...this.state, show:!!enabled });
  }

  render() {
    const {show, title, family, type, count} = this.state;

    return (
      <div className="bdc--pane">
          <div className="bdc--header">
            <div className="bdc--close far fa-times-circle"/>
            <div className="bdc--title">
              {title}
            </div>
            <div className="bdc--label bdc--label__family">FAMILY</div>
            <div className="bdc--value bdc--value__family">{family}</div>
            <div className="bdc--label bdc--label__type">TYPE</div>
            <div className="bdc--value bdc--value__type">{type}</div>
            <div className="bdc--label bdc--label__count">INSTANCES</div>
            <div className="bdc--value bdc--value__count">{count}</div>
          </div>
          <div className="bdc--body">
          </div>
      </div>
    );
  }
}

const domContainer = document.querySelector('#bim-data-container');
ReactDOM.render(<BimDataPane/>, domContainer);
