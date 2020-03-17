'use strict';

// The bim data pane singleton.
let _bimDataPaneInstance;

class BimDataPane extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            show: false,
            title: "BIM Element Name",
            family: "Furniture",
            type: "Table",
            parameters: [
                "Height: 13'",
                "Width: 10\"",
            ],
            count: 12,
        };
        // Assign ourselves as the instance singleton.
        _bimDataPaneInstance = this;
    }

    setBimData(title, family, type, parameters, count) {
        this.setState({ ...this.state, title, family, type, parameters: [...parameters], count });
    }

    display(enabled) {
        this.setState({ ...this.state, show: !!enabled });
    }

    render() {
        const { show, title, family, type, count, parameters } = this.state;
        if (!show) return null;

        return (
            <div className="bdc--pane">
                <div className="bdc--header">
                    <div className="bdc--close far fa-times-circle" onClick={() => this.display(false)}/>
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
                    <div className="bdc--body__subtitle">Parameters</div>
                    <div className="bdc--body__value-region">
                        {parameters.map((p, i) => (<div key={i} className="bdc--body__value">{p}</div>))}
                    </div>
                </div>
            </div>
        );
    }
}

class BimDataPicker extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            isPicking: false,
        }
        this.buttonRef = React.createRef();
    }

    handleButtonPress(evt) {
        if (this.state.isPicking) {
            this._endPicking(evt);
        } else {
            this._beginPicking(evt);
        }
    }

    handlePicked(evt) {

        // If we picked this button, return to let the onClick handler propagate the end picking call.
        if (evt.target === this.buttonRef.current ||
            evt.target.parentElement === this.buttonRef.current) {
            return;
        }

        if (evt.target.id !== "vimcanvas") {
            this._endPicking(evt);
            return;
        }

        if (!vim3d) {
            this._endPicking(evt);
            console.error("vim3d not detected.");
            return;
        }

        const mouseCoords = vim3d.getEventMouseCoordinates(evt);
        const intersections = vim3d.getRayCastIntersections(mouseCoords);
        if (intersections.length > 0) {
            const { distance, point, face, faceIndex, object, uv, uv2, instanceId } = intersections[0];
            _bimDataPaneInstance.setBimData(
                `Title`,
                `Family`,
                `Type`,
                [
                    `Distance: ${distance}`,
                    `Face: ${face}`,
                    `FaceIndex: ${faceIndex}`,
                    `Object: ${object}`,
                    `InstanceId: ${instanceId}`,
                    `Point: ${point}`,
                ],
                `0`
            );
            _bimDataPaneInstance.display(true);
        }

        this._endPicking(evt);
    }

    _beginPicking(evt) {
        this._handlePickedReference = this.handlePicked.bind(this);
        document.addEventListener('mouseup', this._handlePickedReference)
        document.addEventListener('touchend', this._handlePickedReference)

        this.setState( { ...this.state, isPicking: true });
    }

    _endPicking(evt) {
        if (this._handlePickedReference) {
            document.removeEventListener('mouseup', this._handlePickedReference)
            document.removeEventListener('touchend', this._handlePickedReference)
            delete this._handlePickedReference;
        }

        this.setState( { ...this.state, isPicking: false });
    }

    render() {
        const { isPicking } = this.state;

        return (
            <div className="bdp--container">
                <div className="bdp--btn" ref={this.buttonRef} onClick={this.handleButtonPress.bind(this)}>
                    {
                        isPicking
                            ? <i className="fas fa-times"></i>
                            : <i className="fas fa-crosshairs"></i> 
                    }
                </div>
            </div>
        );
    }
}

class Overlay extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="overlay--root">
                <BimDataPane />
                <BimDataPicker />
            </div>
        );
    }
}

ReactDOM.render(
    <Overlay />,
    document.querySelector('#overlay')
);
