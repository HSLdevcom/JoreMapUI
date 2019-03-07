import React from 'react';
import { observer } from 'mobx-react';
import { matchPath } from 'react-router';
import classnames from 'classnames';
import navigator from '~/routing/navigator';
import SubSites from '~/routing/subSites';
import LoginStore from '~/stores/loginStore';
import RoutePathButtons from './toolbarRoutePathButtons';
import ToolbarCommonButtons from './ToolbarCommonButtons';
import ToolbarHelp from './toolbarHelp';
import * as s from './toolbar.scss';

@observer
class Toolbar extends React.Component {
    private renderObjectSpecificTools = () => {
        if (!LoginStore!.hasWriteAccess) return null;
        if (matchPath(navigator.getPathName(), SubSites.routePath)) {
            return <RoutePathButtons />;
        }
        return null;
    }

    render() {
        return (
            <div className={s.toolbarContainer}>
                <div className={s.toolbarRow}>
                    <div className={classnames(s.toolbar, s.modeSpecificToolbar)}>
                        {this.renderObjectSpecificTools()}
                    </div>
                    <div className={s.toolbar}>
                        <ToolbarCommonButtons
                            hasWriteAccess={LoginStore!.hasWriteAccess}
                        />
                    </div>
                </div>
                <ToolbarHelp />
            </div>
        );
    }
}

export default Toolbar;
