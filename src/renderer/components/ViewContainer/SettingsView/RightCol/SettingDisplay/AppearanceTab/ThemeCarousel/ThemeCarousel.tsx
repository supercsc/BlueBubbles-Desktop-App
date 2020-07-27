/* eslint-disable react/no-unused-state */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable max-len */
/* eslint-disable react/prefer-stateless-function */
import * as React from "react";
import "./ThemeCarousel.css";
import { ipcRenderer } from "electron";
import { Theme } from "@server/databases/config/entity/Theme";

interface Props {
    isEditingBlurred: boolean;
}

interface State {
    configTheme: string;
    currentTheme: Theme;
    allThemes: Array<string>;
}

class ThemeCarousel extends React.Component<Props, State> {
    constructor(props) {
        super(props);

        this.state = {
            allThemes: [],
            configTheme: "",
            currentTheme: {
                name: "",
                titleBarCloseColor: "",
                titleBarMinimizeColor: "",
                titleBarMaximizeColor: "",
                searchBackgroundColor: "",
                searchPlaceholderColor: "",
                sidebarColor: "",
                blueColor: "",
                mainTitleColor: "",
                subTitleColor: "",
                secondaryColor: "",
                backgroundColor: "",
                rightSidePrimaryColor: "",
                rightSideSecondaryColor: "",
                chatLabelColor: "",
                incomingMessageColor: "",
                incomingMessageTextColor: "",
                outgoingMessageColor: "",
                outgoingMessageTextColor: "",
                attachmentButtonColor: "",
                attachmentClipColor: "",
                sendButtonColor: "",
                sendArrowColor: "",
                newChatButtonColor: "",
                sidebarBlurredColor: "",
                secondaryBlurredColor: ""
            }
        };
    }

    async componentDidMount() {
        const config = await ipcRenderer.invoke("get-config");
        this.setState({ configTheme: config.currentTheme, allThemes: config.allThemes.split(",") });

        let currentTheme: Theme = await ipcRenderer.invoke("get-theme", config.currentTheme);
        this.setState({ currentTheme });

        ipcRenderer.on("config-update", async (_, args) => {
            this.setState({ configTheme: args.currentTheme, allThemes: args.allThemes.split(",") });

            currentTheme = await ipcRenderer.invoke("get-theme", args.currentTheme);
            this.setState({ currentTheme });
        });
    }

    handleThemeChange(e) {
        const newTheme = e.target.getAttribute("data-set-theme");
        this.setState({ configTheme: newTheme });

        // Set new theme and save to database
        const config = { currentTheme: newTheme };
        ipcRenderer.invoke("set-config", config);
    }

    handleBackArrowTheme(): string {
        if (this.state.allThemes.indexOf(this.state.configTheme) === 0) {
            return this.state.allThemes[this.state.allThemes.length - 1];
        }
        return this.state.allThemes[this.state.allThemes.indexOf(this.state.configTheme) - 1];
    }

    handleNextArrowTheme(): string {
        if (this.state.allThemes.indexOf(this.state.configTheme) === this.state.allThemes.length - 1) {
            return this.state.allThemes[0];
        }
        return this.state.allThemes[this.state.allThemes.indexOf(this.state.configTheme) + 1];
    }

    render() {
        return (
            <div id="ThemeCarousel">
                <div id="prevThemeArrowDiv">
                    <i
                        className="arrow left"
                        data-set-theme={this.handleBackArrowTheme()}
                        onClick={e => this.handleThemeChange(e)}
                    />
                </div>
                <div id="currentThemeDiv">
                    <h1 className="currentThemeTitle">
                        {this.state.configTheme.charAt(0).toUpperCase() + this.state.configTheme.slice(1)}
                    </h1>
                    <svg viewBox="0 0 1600 1000">
                        {/* Left Nav */}
                        <rect
                            x="0"
                            y="0"
                            height="100%"
                            width="400"
                            fill={
                                this.props.isEditingBlurred
                                    ? this.state.currentTheme.sidebarBlurredColor
                                    : this.state.currentTheme.sidebarColor
                            }
                        />
                        {/* Title Bar Buttons */}
                        <circle r="20" cx="30" cy="30" fill={this.state.currentTheme.titleBarCloseColor} />
                        <circle r="20" cx="80" cy="30" fill={this.state.currentTheme.titleBarMinimizeColor} />
                        <circle r="20" cx="130" cy="30" fill={this.state.currentTheme.titleBarMaximizeColor} />
                        {/* Search Bar */}
                        <rect
                            x="25"
                            y="60"
                            rx="15"
                            height="60"
                            width="275"
                            fill={this.state.currentTheme.searchBackgroundColor}
                        />
                        {/* Active Chat */}
                        <rect x="0" y="284" height="140" width="400" fill={this.state.currentTheme.blueColor} />
                        {/* New Chat Button */}
                        <rect
                            x="320"
                            y="60"
                            rx="15"
                            height="60"
                            width="65"
                            fill={this.state.currentTheme.newChatButtonColor}
                        />
                        {/* Secondary Items */}
                        <rect
                            x="0"
                            y="140"
                            rx="15"
                            height="7"
                            width="400"
                            fill={this.state.currentTheme.subTitleColor}
                        />
                        <rect
                            x="50"
                            y="280"
                            rx="15"
                            height="7"
                            width="350"
                            fill={this.state.currentTheme.subTitleColor}
                        />
                        <rect
                            x="50"
                            y="420"
                            rx="15"
                            height="7"
                            width="350"
                            fill={this.state.currentTheme.subTitleColor}
                        />
                        <rect
                            x="50"
                            y="560"
                            rx="15"
                            height="7"
                            width="350"
                            fill={this.state.currentTheme.subTitleColor}
                        />
                        <rect
                            x="50"
                            y="700"
                            rx="15"
                            height="7"
                            width="350"
                            fill={this.state.currentTheme.subTitleColor}
                        />
                        <rect
                            x="50"
                            y="840"
                            rx="15"
                            height="7"
                            width="350"
                            fill={this.state.currentTheme.subTitleColor}
                        />
                        <rect
                            x="385"
                            y="200"
                            rx="15"
                            height="275"
                            width="15"
                            fill={this.state.currentTheme.subTitleColor}
                        />
                        {/* Chat Title */}
                        <text
                            x="65"
                            y="330"
                            fontFamily="SF UI Display Bold"
                            fontSize="40"
                            fill={this.state.currentTheme.mainTitleColor}
                        >
                            A Chat Title
                        </text>
                        {/* Right Background */}
                        <rect x="400" y="0" height="100%" width="1200" fill={this.state.currentTheme.backgroundColor} />
                        {/* Top Right Nav */}
                        <rect
                            x="400"
                            y="0"
                            height="140"
                            width="1200"
                            fill={
                                this.props.isEditingBlurred
                                    ? this.state.currentTheme.secondaryBlurredColor
                                    : this.state.currentTheme.secondaryColor
                            }
                        />
                        {/* Top Right Text */}
                        <text
                            x="425"
                            y="100"
                            fontFamily="SF UI Display Bold"
                            fontSize="40"
                            fill={this.state.currentTheme.rightSideSecondaryColor}
                        >
                            To:
                        </text>
                        <text
                            x="490"
                            y="100"
                            fontFamily="SF UI Display Bold"
                            fontSize="40"
                            fill={this.state.currentTheme.rightSidePrimaryColor}
                        >
                            Chat Participants
                        </text>
                        {/* Outgoing Message */}
                        <rect
                            x="1175"
                            y="200"
                            rx="40"
                            height="75"
                            width="400"
                            fill={this.state.currentTheme.outgoingMessageColor}
                        />
                        <rect
                            x="1025"
                            y="300"
                            rx="40"
                            height="75"
                            width="550"
                            fill={this.state.currentTheme.outgoingMessageColor}
                        />
                        {/* Incoming Message */}
                        <rect
                            x="425"
                            y="400"
                            rx="40"
                            height="75"
                            width="400"
                            fill={this.state.currentTheme.incomingMessageColor}
                        />
                        <rect
                            x="425"
                            y="500"
                            rx="40"
                            height="75"
                            width="550"
                            fill={this.state.currentTheme.incomingMessageColor}
                        />
                        {/* Bottom Right Nav */}
                        <rect
                            x="400"
                            y="860"
                            height="140"
                            width="1200"
                            fill={
                                this.props.isEditingBlurred
                                    ? this.state.currentTheme.secondaryBlurredColor
                                    : this.state.currentTheme.secondaryColor
                            }
                        />
                        {/* Attachment Button */}
                        <rect
                            x="425"
                            y="905"
                            rx="13"
                            height="60"
                            width="65"
                            fill={this.state.currentTheme.attachmentButtonColor}
                        />
                        {/* New Message Input */}
                        <rect
                            x="525"
                            y="905"
                            rx="20"
                            height="60"
                            width="900"
                            fill={this.state.currentTheme.rightSideSecondaryColor}
                        />
                        <rect
                            x="530"
                            y="910"
                            rx="20"
                            height="50"
                            width="890"
                            fill={this.state.currentTheme.secondaryColor}
                        />
                        {/* Send Message */}
                        <circle r="33" cx="1500" cy="930" fill={this.state.currentTheme.sendButtonColor} />
                        <rect
                            x="1494"
                            y="910"
                            rx="5"
                            height="40"
                            width="10"
                            fill={this.state.currentTheme.sendArrowColor}
                        />
                        <rect
                            x="1700"
                            y="-416"
                            rx="5"
                            height="25"
                            width="10"
                            fill={this.state.currentTheme.sendArrowColor}
                            transform="rotate(45)"
                        />
                        <rect
                            x="409"
                            y="1702"
                            rx="5"
                            height="25"
                            width="10"
                            fill={this.state.currentTheme.sendArrowColor}
                            transform="rotate(-45)"
                        />
                    </svg>
                </div>
                <div id="nextThemeArrowDiv">
                    <i
                        className="arrow right"
                        data-set-theme={this.handleNextArrowTheme()}
                        onClick={e => this.handleThemeChange(e)}
                    />
                </div>
            </div>
        );
    }
}

export default ThemeCarousel;
