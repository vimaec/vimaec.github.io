'use strict';

// The bim data pane singleton.
let _bimDataPaneInstance;

// The bim data object.
let _bimDataConverter;

/**
 * JSON bim data lookup
 * @typedef {{
 *     StringData: string[],
 *     FaceToElementId: number[],
 *     ElementToProperties: Map<number, number[]>,
 *     ElementToFamilyInfo: Map<number, string[]>}} BimDataPayload
 */

 /**
  * Converts ray cast information into bim data.
  * @class
  * @property {BimDataPayload} bimData
  */
class BimDataConverter {

    /**
     * Constructor.
     * @param {BimDataPayload} bimData
     */
    constructor(bimData) {
        this.bimData = bimData;
    }

    /**
     * Returns the bim data associated with the intersection.
     * @param {*} intersection The Threejs intersection object.
     * @returns {{ name: string, type: string, familyName: string, properties: string[] }}
     */
    getBimData(intersection) {
        if (!intersection) {
            throw new Error("Invalid intersection", intersection);
        }

        if (!this.bimData) {
            throw new Error("Invalid bim data", this.bimData);
        }

        const {
            distance,
            point,
            face,
            faceIndex: raycastFaceIndex,
            object: meshObject,
            uv,
            uv2,
            instanceId } = intersection;

        // De-reference the element properties based on the given mesh object and intersected face.
        const faceGroupIds = meshObject.geometry.getAttribute("facegroupids").array;
        const elementId = this.bimData.FaceToElementId[faceGroupIds[raycastFaceIndex]];
        const rawElementProperties = this.bimData.ElementToProperties[elementId];

        // Populate the element information to return.
        const propertySet = new Set();
        for(let i = 0; i < rawElementProperties.length; i = i + 2) {

            const keyStringIndex = rawElementProperties[i];
            const valueStringIndex = rawElementProperties[i + 1];

            const key = this.bimData.StringData[keyStringIndex];
            const value = this.bimData.StringData[valueStringIndex];

            propertySet.add(`${key}: ${value}`);
        }
        const properties = [...propertySet];
        properties.sort();

        const [name, familyName, type] = this.bimData.ElementToFamilyInfo[elementId];

        return {
            name, familyName, type, properties,
        };
    }
}

class BimDataPane extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            show: false,
            title: "Title",
            family: "Family",
            type: "Type",
            parameters: [],
            count: 0,
        };
        // Assign ourselves as the instance singleton.
        _bimDataPaneInstance = this;
    }

    setBimData(title, family, type, parameters, count) {
        this.setState((state) => ({ title, family, type, parameters: [...parameters], count }));
    }

    display(enabled) {
        this.setState((state) => ({ show: !!enabled }));
    }

    render() {
        const { show, title, family, type, count, parameters } = this.state;
        if (!show) return null;

        return (
            <div className="bdc--pane">
                <div className="bdc--header">
                    <div
                        className="bdc--close far fa-times-circle"
                        onTouchEnd={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            this.display(false);
                        }}
                        onClick={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            this.display(false);
                        }}
                    />
                    <div className="bdc--title scrollable-text custom-scrollbar">
                        {title}
                    </div>
                    <div className="bdc--label bdc--label__family">FAMILY</div>
                    <div className="bdc--value bdc--value__family scrollable-text custom-scrollbar">{family}</div>
                    <div className="bdc--label bdc--label__type">TYPE</div>
                    <div className="bdc--value bdc--value__type scrollable-text custom-scrollbar">{type}</div>
                    {/* <div className="bdc--label bdc--label__count">INSTANCES</div>
                    <div className="bdc--value bdc--value__count">{count}</div> */}
                </div>
                <div className="bdc--body custom-scrollbar">
                    <div className="bdc--body__subtitle">Parameters</div>
                    <div className="bdc--body__value-region">
                        {parameters.map((p, i) => (<div key={i} className="bdc--body__value">{p}</div>))}
                    </div>
                </div>
            </div>
        );
    }
}

const _longPressTimer = 1500;

// from: https://material-ui.com/components/progress/#customized-progress-bars
function LongPressIndicator() {
    const [completed, setCompleted] = React.useState(0);

    const interval = 50; // 16ms per frame (60fps)
    const maxProgress = 100;
    const deltaPerFrame = (interval / (_longPressTimer * 0.65)) * maxProgress;

    React.useEffect(() => {

      function progress() {
        setCompleted(oldCompleted => {
          if (oldCompleted > maxProgress) {
            return maxProgress;
          }
          const _progress = Math.min(oldCompleted + deltaPerFrame, maxProgress);
          return _progress;
        });
      }
  
      const timer = setInterval(progress, interval);

      return () => {
        clearInterval(timer);
      };
    }, []);
  
    return (
      <div className="bdp--linear-progress-container">
        <MaterialUI.LinearProgress variant="determinate" value={completed} className="bdp--progress" />
      </div>
    );
}

class Overlay extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            longPressInitiated: false,
            startClientLocation: null,
        };
    }

    displayBimData(clientLocation) {
        const mouseCoords = vim3d.getEventMouseCoordinates(clientLocation);
        const intersections = vim3d.getRayCastIntersections(mouseCoords);
        if (intersections.length > 0) {

            const { name, familyName, type, properties } = _bimDataConverter.getBimData(intersections[0]);

            _bimDataPaneInstance.setBimData(
                name,
                familyName,
                type,
                properties,
                `0`
            );
            _bimDataPaneInstance.display(true);
        }
    }

    handleCompleteLongPress() {
        if (this.state.startClientLocation) {
            this.displayBimData(this.state.startClientLocation);
        }
        this.handleEndLongPress();
    }

    getCursorClientLocation(evt) {
        let cursorClientLocation = undefined;

        if (event.touches && event.touches.length > 0) {
            // single-touch
            cursorClientLocation = {
                clientX: evt.changedTouches[0].clientX,
                clientY: evt.changedTouches[0].clientY,
            };
        } else if (evt.clientX !== undefined && evt.clientY !== undefined) {
            // mouse
            cursorClientLocation = {
                clientX: evt.clientX,
                clientY: evt.clientY,
            };
        }
        return cursorClientLocation;
    }

    handleBeginLongPress(evt) {
        if (evt.target.id !== "vimcanvas") {
            return;
        }

        if (!vim3d) {
            console.error("vim3d not detected.");
            return;
        }

        // If it's a touch event, only act if there is exactly one touch.
        if (evt.touches && evt.touches.length !== 1) {
            return;
        }
        evt.preventDefault();

        const startClientLocation = this.getCursorClientLocation(evt);
        if (startClientLocation) {
            this.setState((state) => ({
                longPressInitiated: true,
                startClientLocation,
            }));
            this._handleAbortLongPressReference = this.handleAbortLongPress.bind(this);
            document.addEventListener('mousemove', this._handleAbortLongPressReference);
            document.addEventListener('touchmove', this._handleAbortLongPressReference, { passive: false });

            this._handleEndLongPressReference = this.handleEndLongPress.bind(this)
            document.addEventListener('mouseout', this._handleEndLongPressReference);
            document.addEventListener('mouseup', this._handleEndLongPressReference);
            document.addEventListener('touchend', this._handleEndLongPressReference, { passive: false });

            this._handleCompleteLongPressReference = this.handleCompleteLongPress.bind(this);
            this._timeoutReference = window.setTimeout(this._handleCompleteLongPressReference, _longPressTimer);
        }
    }

    handleAbortLongPress(evt) {
        // check if the movement "wiggle" threshold has been exceeded.
        if (this.state.startClientLocation) {
            const { clientX: x1, clientY: y1 } = this.state.startClientLocation;
            const { clientX: x2, clientY: y2 } = this.getCursorClientLocation(evt);
            const dx = x2 - x1;
            const dy = y2 - y1;
    
            const threshold = 10; // 10 pixels
            const distance = Math.sqrt(dx*dx + dy*dy);
            if (distance <= threshold) return;
        }

        // threshold exceeded; abort long press.
        this.handleEndLongPress(evt);
    }

    handleEndLongPress(evt) {
        if (evt) {
            evt.preventDefault();
        }

        this.setState((state) => ({
            longPressInitiated: false,
            startClientLocation: null,
        }));

        if (this._handleAbortLongPressReference) {
            document.removeEventListener('mousemove', this._handleAbortLongPressReference);
            document.removeEventListener('touchmove', this._handleAbortLongPressReference);
        }
        delete this._handleAbortLongPressReference;

        if (this._handleEndLongPressReference) {
            document.removeEventListener('mouseout', this._handleEndLongPressReference);
            document.removeEventListener('mouseup', this._handleEndLongPressReference);
            document.removeEventListener('touchend', this._handleEndLongPressReference);
        }
        delete this._handleEndLongPressReference;

        if (this._timeoutReference) {
            window.clearTimeout(this._timeoutReference);
        }
        delete this._timeoutReference;

        delete this._handleCompleteLongPressReference;
    }

    addLongPressListener() {
        this._handleBeginLongPressReference = this.handleBeginLongPress.bind(this);
        document.addEventListener('mousedown', this._handleBeginLongPressReference);
        document.addEventListener('touchstart', this._handleBeginLongPressReference, { passive: false });
    }

    removeLongPressListener() {
        if (this._handleBeginLongPressReference)
        {
            document.removeEventListener('mousedown', this._handleBeginLongPressReference);
            document.removeEventListener('touchstart', this._handleBeginLongPressReference);
        }
        delete this._handleBeginLongPressReference;
    }

    async componentDidMount() {
        try {
            const response = await fetch('./models/houston.bim.json');
            const bimData = await response.json();
            _bimDataConverter = new BimDataConverter(bimData);
        } catch (err) {
            console.error(err);
        }

        this.addLongPressListener();

        document.dispatchEvent(new Event('overlay-loaded'));
    }

    componentWillUnmount() {
        this.removeLongPressListener();
    }

    render() {
        return (
            <div className="overlay--root">
                <div class="overlay--nav">
                    <div id="logo"/>
                </div>
                <BimDataPane />
                { this.state.longPressInitiated
                    ? <LongPressIndicator />
                    : null
                }
            </div>
        );
    }
}

ReactDOM.render(
    <Overlay />,
    document.querySelector('#overlay')
);
