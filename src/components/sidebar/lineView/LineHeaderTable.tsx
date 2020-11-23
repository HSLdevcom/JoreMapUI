import classnames from 'classnames';
import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { Button } from '~/components/controls';
import InputContainer from '~/components/controls/InputContainer';
import { ISaveModel } from '~/components/overlays/SavePrompt';
import SaveButton from '~/components/shared/SaveButton';
import Loader from '~/components/shared/loader/Loader';
import LineHeaderFactory from '~/factories/lineHeaderFactory';
import ILineHeader from '~/models/ILineHeader';
import LineHeaderService from '~/services/lineHeaderService';
import { AlertStore } from '~/stores/alertStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { ErrorStore } from '~/stores/errorStore';
import { IMassEditLineHeader, LineHeaderMassEditStore } from '~/stores/lineHeaderMassEditStore';
import { LineStore } from '~/stores/lineStore';
import { LoginStore } from '~/stores/loginStore';
import { NavigationStore } from '~/stores/navigationStore';
import { areDatesEqual, toMidnightDate } from '~/utils/dateUtils';
import FormValidator from '~/validation/FormValidator';
import SidebarHeader from '../SidebarHeader';
import LineHeaderForm from './LineHeaderForm';
import LineHeaderTableRows from './LineHeaderTableRows';
import SearchLineHeadersToCopy from './SearchLineHeadersToCopy';
import * as s from './lineHeaderTable.scss';

interface ILineHeaderState {
    isLoading: boolean;
    lineHeaders: ILineHeader[] | null;
    isSearchLineHeadersToCopyViewVisible: boolean;
}

interface ILineHeaderListProps {
    lineId: string;
    scrollToTheBottomOfLineView: Function;
    lineHeaderMassEditStore?: LineHeaderMassEditStore;
    lineStore?: LineStore;
    confirmStore?: ConfirmStore;
    alertStore?: AlertStore;
    errorStore?: ErrorStore;
    navigationStore?: NavigationStore;
    loginStore?: LoginStore;
}

@inject(
    'lineHeaderMassEditStore',
    'confirmStore',
    'alertStore',
    'errorStore',
    'navigationStore',
    'lineStore',
    'loginStore'
)
@observer
class LineHeaderTable extends React.Component<ILineHeaderListProps, ILineHeaderState> {
    private _isMounted: boolean;
    constructor(props: ILineHeaderListProps) {
        super(props);
        this.state = {
            isLoading: true,
            lineHeaders: null,
            isSearchLineHeadersToCopyViewVisible: false,
        };
    }

    private _setState = (newState: object, callback?: Function) => {
        if (this._isMounted) {
            this.setState(newState, () => {
                if (callback) callback();
            });
        }
    };

    componentDidMount() {
        this._isMounted = true;
        this.initExistingLineHeaders();
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    private initExistingLineHeaders = async () => {
        this._setState({ isLoading: true });
        const lineHeaders: ILineHeader[] = await LineHeaderService.fetchLineHeaders(
            this.props.lineId
        );
        if (lineHeaders) {
            this.props.lineHeaderMassEditStore!.init(lineHeaders);
        }
        this._setState({
            lineHeaders,
            isLoading: false,
        });
    };

    private createNewLineHeader = () => {
        const firstLineHeader = this.props.lineHeaderMassEditStore!.getFirstLineHeader();
        let defaultDate: Date = new Date();

        if (firstLineHeader) {
            defaultDate = new Date(firstLineHeader.endDate);
            defaultDate.setDate(defaultDate.getDate() + 1);
        }
        const newLineHeader = LineHeaderFactory.createNewLineHeader({
            lineId: this.props.lineId,
            startDate: defaultDate,
            endDate: defaultDate,
        });
        this.props.lineHeaderMassEditStore!.createLineHeader(newLineHeader);
    };

    private onChangeLineHeaderProperty = (property: keyof ILineHeader, value: any) => {
        this.props.lineHeaderMassEditStore!.updateLineHeaderProperty(property, value);
    };

    private getActiveLineHeaderName = (): string | null => {
        const currentTime = toMidnightDate(new Date()).getTime();
        let activeMassEditLineHeader: IMassEditLineHeader | null = null;
        this.props.lineHeaderMassEditStore!.massEditLineHeaders!.forEach(
            (m: IMassEditLineHeader) => {
                if (m.isRemoved) return;

                const lineHeader = m.lineHeader;
                if (
                    currentTime >= lineHeader.startDate!.getTime() &&
                    currentTime <= lineHeader.endDate!.getTime()
                ) {
                    activeMassEditLineHeader = m;
                }
            }
        );
        return activeMassEditLineHeader ? activeMassEditLineHeader!.lineHeader.lineNameFi : null;
    };

    private save = async () => {
        const lineHeaderMassEditStore = this.props.lineHeaderMassEditStore;
        this._setState({ isLoading: true });

        try {
            await LineHeaderService.massEditLineHeaders(
                lineHeaderMassEditStore!.massEditLineHeaders!,
                lineHeaderMassEditStore!.oldLineHeaders!,
                this.props.lineId
            );
            this.initExistingLineHeaders();
            this.props.alertStore!.setFadeMessage({ message: 'Tallennettu!' });
        } catch (e) {
            this.props.errorStore!.addError('', e);
            this._setState({ isLoading: false });
        }
    };

    private isFormValid = () => {
        let isFormValid = true;
        this.props.lineHeaderMassEditStore!.massEditLineHeaders!.forEach(
            (m: IMassEditLineHeader) => {
                if (m.isRemoved) return;

                if (!FormValidator.isInvalidPropertiesMapValid(m.invalidPropertiesMap)) {
                    isFormValid = false;
                }
            }
        );
        return isFormValid;
    };

    private isSameLineHeader = (a: ILineHeader, b: ILineHeader) => {
        return (
            a.originalStartDate &&
            b.originalStartDate &&
            a.lineId === b.lineId &&
            areDatesEqual(a.originalStartDate, b.originalStartDate)
        );
    };

    private showSavePrompt = () => {
        const confirmStore = this.props.confirmStore;
        const lineHeaderMassEditStore = this.props.lineHeaderMassEditStore;
        const oldLineHeaders = lineHeaderMassEditStore!.oldLineHeaders!;
        const currentLineHeaders = lineHeaderMassEditStore!.currentLineHeaders!;
        const saveModels: ISaveModel[] = [];

        currentLineHeaders.forEach((currentLineHeader: ILineHeader) => {
            !currentLineHeader.originalStartDate
                ? saveModels.push({
                      type: 'saveModel',
                      subTopic: `Linjan otsikko: ${currentLineHeader.lineNameFi}`,
                      newData: currentLineHeader,
                      oldData: {},
                      model: 'lineHeader',
                  })
                : oldLineHeaders!.forEach((oldLineHeader: ILineHeader) => {
                      if (this.isSameLineHeader(oldLineHeader, currentLineHeader)) {
                          saveModels.push({
                              type: 'saveModel',
                              subTopic: `Linjan otsikko: ${currentLineHeader.lineNameFi}`,
                              newData: currentLineHeader,
                              oldData: oldLineHeader,
                              model: 'lineHeader',
                          });
                      }
                  });
        });

        const removedLineHeaders = lineHeaderMassEditStore!.removedLineHeaders;
        removedLineHeaders.forEach((deletedLineHeader: ILineHeader) => {
            saveModels.push({
                type: 'saveModel',
                subTopic: `Linjan otsikko: ${deletedLineHeader.lineNameFi}`,
                isRemoved: true,
                newData: null,
                oldData: null,
                model: 'lineHeader',
            });
        });
        const savePromptSection = { models: saveModels };
        confirmStore!.openConfirm({
            confirmComponentName: 'savePrompt',
            confirmData: { savePromptSections: [savePromptSection] },
            onConfirm: () => {
                this.save();
            },
        });
    };

    private editLineHeaderPrompt = () => {
        if (!this.props.lineStore!.isEditingDisabled) {
            this.props.lineStore!.toggleIsEditingDisabled();
        }
        this.props.lineHeaderMassEditStore!.toggleIsEditingDisabled();
    };

    private setIsSearchLineHeadersCopyViewOpen = ({ isOpen }: { isOpen: boolean }) => {
        // If already open and we try opening again, scroll to the bottom of lineView
        if (this.state.isSearchLineHeadersToCopyViewVisible && isOpen) {
            this.props.scrollToTheBottomOfLineView();
            return;
        }
        this._setState({
            isSearchLineHeadersToCopyViewVisible: isOpen,
        });
    };

    render() {
        if (this.state.isLoading) {
            return <Loader size='small' />;
        }

        const lineHeaderMassEditStore = this.props.lineHeaderMassEditStore;
        const massEditLineHeaders = lineHeaderMassEditStore!.massEditLineHeaders;
        const isEditingDisabled = lineHeaderMassEditStore!.isEditingDisabled;
        if (!massEditLineHeaders) return null;

        const currentLineHeaders = lineHeaderMassEditStore!.currentLineHeaders;
        const selectedMassEditLineHeader =
            lineHeaderMassEditStore!.selectedLineHeaderId !== null
                ? lineHeaderMassEditStore!.massEditLineHeaders!.find(
                      (m) => m.id === lineHeaderMassEditStore!.selectedLineHeaderId
                  )
                : null;
        const activeLineHeaderName = this.getActiveLineHeaderName();
        const isSaveButtonDisabled =
            isEditingDisabled ||
            !lineHeaderMassEditStore!.isDirty ||
            !this.isFormValid() ||
            !activeLineHeaderName;
        return (
            <div className={s.lineHeaderTableView}>
                <SidebarHeader
                    isEditing={!isEditingDisabled}
                    onEditButtonClick={this.editLineHeaderPrompt}
                    isEditButtonVisible={currentLineHeaders.length > 0}
                >
                    Linjan otsikot
                </SidebarHeader>
                <div className={s.flexRow}>
                    <InputContainer
                        disabled={true}
                        label={'LINJAN VOIMASSAOLEVA OTSIKKO'}
                        value={
                            activeLineHeaderName
                                ? activeLineHeaderName
                                : 'Ei voimassa olevaa otsikkoa.'
                        }
                        validationResult={{
                            isValid: Boolean(activeLineHeaderName),
                        }}
                        isInputColorRed={!Boolean(activeLineHeaderName)}
                        data-cy='activeLineHeaderName'
                    />
                </div>
                {currentLineHeaders.length > 0 ? (
                    <table className={s.lineHeaderTable}>
                        <tbody>
                            <tr>
                                <th className={classnames(s.inputLabel, s.columnHeader)}>
                                    LINJAN NIMI
                                </th>
                                <th className={classnames(s.inputLabel, s.columnHeader)}>
                                    VOIM. AST
                                </th>
                                <th className={classnames(s.inputLabel, s.columnHeader)}>
                                    VIIM. VOIM.
                                </th>
                                <th />
                                <th />
                                <th />
                            </tr>
                            <LineHeaderTableRows />
                        </tbody>
                    </table>
                ) : (
                    <div>Linjalle {this.props.lineId} ei löytynyt otsikoita.</div>
                )}
                {this.props.loginStore!.hasWriteAccess && (
                    <div className={s.lineHeaderButtonContainer}>
                        <Button isWide={true} onClick={() => this.createNewLineHeader()}>
                            Luo uusi linjan otsikko
                        </Button>
                        <Button
                            isWide={true}
                            onClick={() =>
                                this.setIsSearchLineHeadersCopyViewOpen({ isOpen: true })
                            }
                        >
                            Kopioi linjan otsikoita
                        </Button>
                    </div>
                )}
                {selectedMassEditLineHeader && (
                    <LineHeaderForm
                        lineHeader={selectedMassEditLineHeader!.lineHeader}
                        isEditingDisabled={isEditingDisabled}
                        invalidPropertiesMap={selectedMassEditLineHeader!.invalidPropertiesMap}
                        onChangeLineHeaderProperty={this.onChangeLineHeaderProperty}
                    />
                )}
                {this.state.isSearchLineHeadersToCopyViewVisible && (
                    <SearchLineHeadersToCopy
                        closeLineHeadersCopyView={() =>
                            this.setIsSearchLineHeadersCopyViewOpen({ isOpen: false })
                        }
                        scrollToTheBottomOfLineView={this.props.scrollToTheBottomOfLineView}
                    />
                )}
                <SaveButton
                    onClick={this.showSavePrompt}
                    disabled={isSaveButtonDisabled}
                    savePreventedNotification={''}
                    className={s.saveLineHeadersButton}
                >
                    Tallenna linjan otsikot
                </SaveButton>
            </div>
        );
    }
}

export default LineHeaderTable;
