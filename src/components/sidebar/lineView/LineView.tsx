import { inject, observer } from 'mobx-react';
import React from 'react';
import { match } from 'react-router';
import SavePrompt, { ISaveModel } from '~/components/overlays/SavePrompt';
import { ContentItem, ContentList, Tab, Tabs, TabList } from '~/components/shared/Tabs';
import Loader from '~/components/shared/loader/Loader';
import LineFactory from '~/factories/lineFactory';
import navigator from '~/routing/navigator';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import LineService from '~/services/lineService';
import { AlertStore } from '~/stores/alertStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { ErrorStore } from '~/stores/errorStore';
import { LineHeaderMassEditStore } from '~/stores/lineHeaderMassEditStore';
import { LineStore } from '~/stores/lineStore';
import { MapStore } from '~/stores/mapStore';
import SidebarHeader from '../SidebarHeader';
import LineInfoTab from './LineInfoTab';
import LineRoutesTab from './LineRoutesTab';
import * as s from './lineView.scss';

interface ILineViewProps {
    match?: match<any>;
    isNewLine: boolean;
    lineStore?: LineStore;
    lineHeaderMassEditStore?: LineHeaderMassEditStore;
    alertStore?: AlertStore;
    errorStore?: ErrorStore;
    confirmStore?: ConfirmStore;
    mapStore?: MapStore;
}

interface ILineViewState {
    isLoading: boolean;
    selectedTabIndex: number;
}

@inject(
    'lineStore',
    'lineHeaderMassEditStore',
    'errorStore',
    'alertStore',
    'mapStore',
    'confirmStore'
)
@observer
class LineView extends React.Component<ILineViewProps, ILineViewState> {
    private _isMounted: boolean;
    constructor(props: ILineViewProps) {
        super(props);
        this.state = {
            isLoading: true,
            selectedTabIndex: 0,
        };
    }

    private _setState = (newState: object) => {
        if (this._isMounted) {
            this.setState(newState);
        }
    };

    componentDidMount() {
        this._isMounted = true;
        this.initialize();
        this.props.lineStore!.setIsEditingDisabled(!this.props.isNewLine);
    }

    componentWillUnmount() {
        this._isMounted = false;
        this.props.lineStore!.clear();
        this.props.lineHeaderMassEditStore!.clear();
    }

    private setSelectedTabIndex = (index: number) => {
        this._setState({
            selectedTabIndex: index,
        });
    };

    private initialize = async () => {
        this.props.mapStore!.initCoordinates();
        if (this.props.isNewLine) {
            await this.initNewLine();
        } else {
            await this.initExistingLine();
        }
    };

    private initNewLine = async () => {
        this._setState({ isLoading: true });
        const newLine = LineFactory.createNewLine();
        this.props.lineStore!.activate({ line: newLine, isNewLine: true });
        this._setState({ isLoading: false });
    };

    private initExistingLine = async () => {
        this._setState({ isLoading: true });

        const lineId = this.props.match!.params.id;
        const queryResult = await LineService.fetchLineAndRoutes(lineId);
        if (!queryResult) {
            this.props.errorStore!.addError(`Linjan ${lineId} haku epäonnistui.`);
            const homeViewLink = routeBuilder.to(SubSites.home).toLink();
            navigator.goTo({ link: homeViewLink });
            return;
        }
        const { line, routes } = queryResult;
        this.props.lineStore!.activate({ line, isNewLine: false });
        this.props.lineStore!.setRoutes(routes);
        this._setState({ isLoading: false });
    };

    private saveLine = async () => {
        this._setState({ isLoading: true });

        const line = this.props.lineStore!.line;
        try {
            if (this.props.isNewLine) {
                await LineService.createLine(line!);
                const lineViewLink = routeBuilder
                    .to(SubSites.line)
                    .toTarget(':id', this.props.lineStore!.line!.id)
                    .toLink();
                navigator.goTo({
                    link: lineViewLink,
                    shouldSkipUnsavedChangesPrompt: true,
                });
            } else {
                await LineService.updateLine(line!);
                this.props.lineStore!.setIsEditingDisabled(true);
                this.initExistingLine();
            }
            this.props.alertStore!.setFadeMessage({ message: 'Tallennettu!' });
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
        }
    };

    private showSavePrompt = () => {
        const confirmStore = this.props.confirmStore;
        const currentLine = this.props.lineStore!.line;
        const oldLine = this.props.lineStore!.oldLine;
        const saveModel: ISaveModel = {
            type: 'saveModel',
            newData: currentLine ? currentLine : {},
            oldData: oldLine,
            model: 'line',
        };

        confirmStore!.openConfirm({
            content: <SavePrompt models={[saveModel]} />,
            onConfirm: () => {
                this.saveLine();
            },
        });
    };

    render() {
        const lineStore = this.props.lineStore;
        if (this.state.isLoading) {
            return (
                <div className={s.lineView}>
                    <Loader size='medium' />
                </div>
            );
        }
        if (!this.props.lineStore!.line) return null;
        const isEditingDisabled = lineStore!.isEditingDisabled;
        const isSaveButtonDisabled =
            isEditingDisabled || !lineStore!.isDirty || !lineStore!.isLineFormValid;
        return (
            <div className={s.lineView} data-cy='lineView'>
                <div className={s.sidebarHeaderSection}>
                    <SidebarHeader
                        onEditButtonClick={lineStore!.toggleIsEditingDisabled}
                        isEditing={!lineStore!.isEditingDisabled}
                        isBackButtonVisible={true}
                        isCloseButtonVisible={true}
                    >
                        {this.props.isNewLine ? 'Luo uusi linja' : `Linja ja sen otsikot`}
                    </SidebarHeader>
                </div>
                <Tabs>
                    <TabList
                        selectedTabIndex={this.state.selectedTabIndex}
                        setSelectedTabIndex={this.setSelectedTabIndex}
                    >
                        <Tab>
                            <div>Linjan tiedot</div>
                        </Tab>
                        <Tab isDisabled={this.props.isNewLine}>
                            <div>Reitit</div>
                        </Tab>
                    </TabList>
                    <ContentList selectedTabIndex={this.state.selectedTabIndex}>
                        <ContentItem>
                            <LineInfoTab
                                isEditingDisabled={isEditingDisabled}
                                saveLine={this.showSavePrompt}
                                isLineSaveButtonDisabled={isSaveButtonDisabled}
                                isNewLine={this.props.isNewLine}
                            />
                        </ContentItem>
                        <ContentItem>
                            <LineRoutesTab />
                        </ContentItem>
                    </ContentList>
                </Tabs>
            </div>
        );
    }
}

export default LineView;
