import React from 'react';
import classnames from 'classnames';
import { observer, inject } from 'mobx-react';
import { match } from 'react-router';
import ButtonType from '~/enums/buttonType';
import Button from '~/components/controls/Button';
import Loader, { LoaderSize } from '~/components/shared/loader/Loader';
import ViewFormBase from '~/components/shared/inheritedComponents/ViewFormBase';
import lineValidationModel from '~/models/validationModels/lineValidationModel';
import { ErrorStore } from '~/stores/errorStore';
import { LineStore } from '~/stores/lineStore';
import { DialogStore } from '~/stores/dialogStore';
import { Tabs, TabList, Tab, ContentList, ContentItem } from '~/components/shared/Tabs';
import LineService from '~/services/lineService';
import LineFactory from '~/factories/lineFactory';
import routeBuilder from '~/routing/routeBuilder';
import navigator from '~/routing/navigator';
import SubSites from '~/routing/subSites';
import LineRoutesTab from './LineRoutesTab';
import LineInfoTab from './LineInfoTab';
import SidebarHeader from '../SidebarHeader';
import * as s from './lineView.scss';

interface ILineViewProps {
    dialogStore?: DialogStore;
    errorStore?: ErrorStore;
    lineStore?: LineStore;
    match?: match<any>;
    isNewLine: boolean;
}

interface ILineViewState {
    isLoading: boolean;
    invalidPropertiesMap: object;
    isEditingDisabled: boolean;
    selectedTabIndex: number;
}

@inject('lineStore', 'errorStore', 'dialogStore')
@observer
class LineView extends ViewFormBase<ILineViewProps, ILineViewState>{
    constructor(props: ILineViewProps) {
        super(props);
        this.state = {
            isLoading: true,
            invalidPropertiesMap: {},
            isEditingDisabled: !props.isNewLine,
            selectedTabIndex: 0,
        };
    }

    componentDidMount() {
        super.componentDidMount();
        this.initialize();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.props.lineStore!.clear();
    }

    private setSelectedTabIndex = (index: number) => {
        this.setState({
            selectedTabIndex: index,
        });
    }

    private initialize = async () => {
        if (this.props.isNewLine) {
            await this.createNewLine();
        } else {
            await this.initExistingLine();
        }
        if (this.props.lineStore!.line) {
            this.validateAllProperties(
                lineValidationModel,
                this.props.lineStore!.line,
            );
            this.setState({
                isLoading: false,
            });
        }
    }

    private createNewLine = async () => {
        try {
            if (!this.props.lineStore!.line) {
                const newLine = LineFactory.createNewLine();
                this.props.lineStore!.setLine(newLine);
            }
        } catch (e) {
            this.props.errorStore!.addError('Uuden linjan luonti epäonnistui', e);
        }
    }

    private initExistingLine = async () => {
        await this.fetchLine();
    }

    private fetchLine = async () => {
        const lineId = this.props.match!.params.id;
        try {
            const line = await LineService.fetchLine(lineId);
            this.props.lineStore!.setLine(line);
        } catch (e) {
            this.props.errorStore!.addError('Linjan haku epäonnistui.', e);
        }
    }

    private onChangeLineProperty = (property: string) => (value: any) => {
        this.props.lineStore!.updateLineProperty(property, value);
        this.validateProperty(lineValidationModel[property], property, value);
    }

    private save = async () => {
        this.setState({ isLoading: true });
        let redirectUrl: string | undefined;
        const line = this.props.lineStore!.line;
        try {
            if (this.props.isNewLine) {
                const linePrimaryKey = await LineService.createLine(line!);
                redirectUrl = routeBuilder
                    .to(SubSites.line)
                    .toTarget([
                        linePrimaryKey,
                    ].join(','))
                    .toLink();
            } else {
                await LineService.updateLine(line!);
            }

            this.props.dialogStore!.setFadeMessage('Tallennettu!');
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
        }
        this.setState({
            isEditingDisabled: true,
            invalidPropertiesMap: {},
            isLoading: false,
        });
        if (redirectUrl) {
            navigator.goTo(redirectUrl);
        }
    }

    private toggleIsEditing = () => {
        this.toggleIsEditingDisabled(() => {}); // TODO: refactor to use await
    }

    private renderLineViewHeader = () => {
        return (
            <SidebarHeader
                isEditButtonVisible={!this.props.isNewLine}
                onEditButtonClick={this.toggleIsEditing}
                isEditing={!this.state.isEditingDisabled}
                shouldShowClosePromptMessage={this.props.lineStore!.isDirty}
            >
                {this.props.isNewLine ? 'Uusi linja' : `Linja ${this.props.lineStore!.line!.id}`}
            </SidebarHeader>
        );
    }

    render() {

        if (this.state.isLoading) {
            return (
                <div className={classnames(s.lineView, s.loaderContainer)}>
                    <Loader size={LoaderSize.MEDIUM}/>
                </div>
            );
        }
        if (!this.props.lineStore!.line) return null;
        console.log(this.props.lineStore!.line);

        const isSaveButtonDisabled = this.state.isEditingDisabled
            || !this.props.lineStore!.isDirty
            || !this.isFormValid();

        return (
            <div className={s.lineView}>
                {this.renderLineViewHeader()}
                <div>
                    <Tabs>
                        <TabList
                            selectedTabIndex={this.state.selectedTabIndex}
                            setSelectedTabIndex={this.setSelectedTabIndex}
                        >
                            <Tab><div>Linjan tiedot</div></Tab>
                            <Tab><div>Reitit</div></Tab>
                        </TabList>
                        <ContentList selectedTabIndex={this.state.selectedTabIndex}>
                            <ContentItem>
                                <LineInfoTab
                                    isEditingDisabled={this.state.isEditingDisabled}
                                    isNewLine={this.props.isNewLine}
                                    onChange={this.onChangeLineProperty}
                                    invalidPropertiesMap={this.state.invalidPropertiesMap}
                                />
                            </ContentItem>
                            <ContentItem>
                                <LineRoutesTab />
                            </ContentItem>
                        </ContentList>
                    </Tabs>
                </div>
                <Button
                    onClick={this.save}
                    type={ButtonType.SAVE}
                    disabled={isSaveButtonDisabled}
                >
                    {this.props.isNewLine ? 'Luo uusi linja' : 'Tallenna muutokset'}
                </Button>
            </div>
        );
    }
}

export default LineView;
